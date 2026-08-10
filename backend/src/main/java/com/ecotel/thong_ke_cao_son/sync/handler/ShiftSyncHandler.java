package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.Shift;
import com.ecotel.thong_ke_cao_son.repository.ShiftRepository;
import com.ecotel.thong_ke_cao_son.sync.MongoIdUtils;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(1)
@RequiredArgsConstructor
public class ShiftSyncHandler implements MongoSyncHandler {

    private final ShiftRepository shiftRepository;

    @Override
    public String collectionName() {
        return "shifts";
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
        shiftRepository.findByMongoId(mongoId).ifPresent(shiftRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        Shift shift = shiftRepository.findByMongoId(mongoId).orElseGet(Shift::new);
        shift.setMongoId(mongoId);

        Number name = doc.get("name", Number.class);
        shift.setName(name != null ? name.intValue() : null);
        shift.setStartTime(doc.getString("startTime"));
        shift.setEndTime(doc.getString("endTime"));
        shiftRepository.save(shift);
    }
}
