package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.repository.SyncCheckpointRepository;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(0) // chạy trước ChangeStreamRunner (không có @Order = mặc định thấp nhất ưu tiên)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "sync.mongo.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class InitialSyncRunner implements ApplicationRunner {

    private final MongoDatabase mongoSyncDatabase;
    private final List<MongoSyncHandler> handlers;
    private final SyncCheckpointRepository checkpointRepository;

    @Override
    public void run(ApplicationArguments args) {
        // Sắp xếp handler theo @Order để cha luôn sync trước con
        List<MongoSyncHandler> sortedHandlers = handlers.stream()
                .sorted(AnnotationAwareOrderComparator.INSTANCE)
                .toList();

        for (MongoSyncHandler handler : sortedHandlers) {
            if (checkpointRepository.existsById(handler.collectionName())) {
                log.info("Bỏ qua full sync cho {} (đã có checkpoint từ trước)", handler.collectionName());
                continue;
            }
            log.info("Full sync lần đầu cho: {}", handler.collectionName());
            var collection = mongoSyncDatabase.getCollection(handler.collectionName());
            int count = 0;
            for (Document doc : collection.find()) {
                handler.onInsert(doc);
                count++;
            }
            log.info("Hoàn tất full sync {}: {} documents", handler.collectionName(), count);
        }
    }
}
