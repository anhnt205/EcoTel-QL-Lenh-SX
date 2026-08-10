package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.DeviceType;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.repository.DeviceTypeRepository;
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
public class DeviceTypeSyncHandler implements MongoSyncHandler {

    private final DeviceTypeRepository deviceTypeRepository;

    @Override
    public String collectionName() {
        return "devicetypes";
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
        deviceTypeRepository.findByMongoId(mongoId).ifPresent(deviceTypeRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        DeviceType deviceType = deviceTypeRepository.findByMongoId(mongoId).orElseGet(DeviceType::new);
        deviceType.setMongoId(mongoId);
        deviceType.setName(doc.getString("name"));

        String group = doc.getString("group");
        if ("Xe".equalsIgnoreCase(group)) {
            deviceType.setGroup(DeviceGroup.XE);
        } else if ("Máy".equalsIgnoreCase(group) || "May".equalsIgnoreCase(group)) {
            deviceType.setGroup(DeviceGroup.MAY);
        }
        deviceTypeRepository.save(deviceType);
    }
}
