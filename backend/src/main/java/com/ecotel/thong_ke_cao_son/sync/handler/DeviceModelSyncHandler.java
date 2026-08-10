package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.DeviceModel;
import com.ecotel.thong_ke_cao_son.repository.DeviceModelRepository;
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
public class DeviceModelSyncHandler implements MongoSyncHandler {

    private final DeviceModelRepository deviceModelRepository;

    @Override
    public String collectionName() {
        return "devicemodels";
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
        deviceModelRepository.findByMongoId(mongoId).ifPresent(deviceModelRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        DeviceModel deviceModel = deviceModelRepository.findByMongoId(mongoId).orElseGet(DeviceModel::new);
        deviceModel.setMongoId(mongoId);
        deviceModel.setName(doc.getString("name"));
        deviceModelRepository.save(deviceModel);
    }
}
