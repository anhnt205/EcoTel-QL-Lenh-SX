package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.Material;
import com.ecotel.thong_ke_cao_son.model.MaterialValueHistory;
import com.ecotel.thong_ke_cao_son.repository.MaterialRepository;
import com.ecotel.thong_ke_cao_son.sync.MongoIdUtils;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

@Component
@Order(1)
@RequiredArgsConstructor
public class MaterialSyncHandler implements MongoSyncHandler {

    private final MaterialRepository materialRepository;

    @Override
    public String collectionName() {
        return "materials";
    }

    @Override
    @Transactional
    public void onInsert(Document doc) {
        upsert(doc);
    }

    @Override
    @Transactional
    public void onUpdate(Document doc) {
        upsert(doc);
    }

    @Override
    @Transactional
    public void onDelete(String mongoId) {
        materialRepository.findByMongoId(mongoId).ifPresent(materialRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        Material material = materialRepository.findByMongoId(mongoId).orElseGet(Material::new);
        material.setMongoId(mongoId);
        material.setName(doc.getString("name"));
        material.setAcceptedProduct(doc.getString("acceptedProduct"));

        List<Document> historyDocs = doc.getList("valueHistory", Document.class);
        if (historyDocs != null) {
            material.getValueHistory().clear();
            historyDocs.forEach(h -> {
                MaterialValueHistory history = new MaterialValueHistory();

                Number density = h.get("density", Number.class);
                history.setDensity(density != null ? density.doubleValue() : null);

                Number dryDensity = h.get("dryDensity", Number.class);
                history.setDryDensity(dryDensity != null ? dryDensity.doubleValue() : null);

                history.setStartTime(toLocalDateTime(h.getDate("startTime")));
                history.setEndTime(toLocalDateTime(h.getDate("endTime")));

                material.getValueHistory().add(history);
            });
        }

        materialRepository.save(material);
    }

    private LocalDateTime toLocalDateTime(Date date) {
        return date != null ? LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault()) : null;
    }
}
