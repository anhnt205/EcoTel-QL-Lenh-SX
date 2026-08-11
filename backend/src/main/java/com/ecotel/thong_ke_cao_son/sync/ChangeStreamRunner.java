package com.ecotel.thong_ke_cao_son.sync;

import com.ecotel.thong_ke_cao_son.model.SyncCheckpoint;
import com.ecotel.thong_ke_cao_son.repository.SyncCheckpointRepository;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import com.mongodb.client.model.changestream.FullDocument;
import com.mongodb.client.model.changestream.OperationType;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.BsonDocument;
import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "sync.mongo.enabled", havingValue = "true", matchIfMissing = true)
public class ChangeStreamRunner {

    private final MongoDatabase mongoSyncDatabase;
    private final SyncCheckpointRepository checkpointRepository;
    private final List<MongoSyncHandler> handlers;

    private ExecutorService executor;

    @PostConstruct
    public void start() {
        executor = Executors.newFixedThreadPool(handlers.size());
        handlers.forEach(handler -> executor.submit(() -> watchCollection(handler)));
    }

    private void watchCollection(MongoSyncHandler handler) {
        String collectionName = handler.collectionName();
        log.info("Bắt đầu lắng nghe Change Stream cho collection: {}", collectionName);

        while (!Thread.currentThread().isInterrupted()) {
            try {
                var collection = mongoSyncDatabase.getCollection(collectionName);
                var changeStreamIterable = collection.watch().fullDocument(FullDocument.UPDATE_LOOKUP);

                BsonDocument resumeToken = loadResumeToken(collectionName);
                if (resumeToken != null) {
                    changeStreamIterable = changeStreamIterable.resumeAfter(resumeToken);
                }

                try (var cursor = changeStreamIterable.cursor()) {
                    // Lưu checkpoint NGAY sau khi mở cursor thành công, dù chưa có event nào,
                    // để lần restart sau không phải full sync lại (đã xác nhận đây là điểm hiện tại của stream).
                    if (cursor.getResumeToken() != null) {
                        saveResumeToken(collectionName, cursor.getResumeToken());
                    }

                    while (cursor.hasNext() && !Thread.currentThread().isInterrupted()) {
                        ChangeStreamDocument<Document> event = cursor.next();
                        processEvent(handler, event);
                        saveResumeToken(collectionName, event.getResumeToken());
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi Change Stream cho collection {}, thử lại sau 5s", collectionName, e);
                sleep(5000);
            }
        }
    }

    @Transactional
    protected void processEvent(MongoSyncHandler handler, ChangeStreamDocument<Document> event) {
        OperationType opType = event.getOperationType();
        try {
            switch (opType) {
                case INSERT -> handler.onInsert(event.getFullDocument());
                case UPDATE, REPLACE -> {
                    if (event.getFullDocument() != null) {
                        handler.onUpdate(event.getFullDocument());
                    }
                }
                case DELETE -> {
                    Object mongoId = event.getDocumentKey().get("_id");
                    handler.onDelete(mongoId.toString());
                }
                default -> log.debug("Bỏ qua event type: {}", opType);
            }
        } catch (Exception e) {
            log.error("Lỗi xử lý event {} cho collection {}: {}",
                    opType, handler.collectionName(), e.getMessage(), e);
        }
    }

    private BsonDocument loadResumeToken(String collectionName) {
        return checkpointRepository.findById(collectionName)
                .map(cp -> BsonDocument.parse(cp.getResumeToken()))
                .orElse(null);
    }

    @Transactional
    protected void saveResumeToken(String collectionName, BsonDocument token) {
        SyncCheckpoint checkpoint = checkpointRepository.findById(collectionName)
                .orElse(new SyncCheckpoint());
        checkpoint.setCollectionName(collectionName);
        checkpoint.setResumeToken(token.toJson());
        checkpoint.setUpdatedAt(LocalDateTime.now());
        checkpointRepository.save(checkpoint);
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @PreDestroy
    public void stop() {
        if (executor != null) executor.shutdownNow();
    }
}
