package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.sync.MongoIdUtils;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Order(2)
@RequiredArgsConstructor
public class DeviceSyncHandler implements MongoSyncHandler {

    private final DeviceRepository deviceRepository;
    private final DepartmentRepository departmentRepository;
    private final DeviceTypeRepository deviceTypeRepository;
    private final DeviceModelRepository deviceModelRepository;

    @Override
    public String collectionName() {
        return "devices";
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
        deviceRepository.findByMongoId(mongoId).ifPresent(deviceRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        Device device = deviceRepository.findByMongoId(mongoId).orElseGet(Device::new);

        device.setMongoId(mongoId);
        device.setCode(doc.getString("code"));
        device.setName(doc.getString("name"));
        device.setVehicleNumber(doc.getString("vehicleNumber"));
        device.setFuelType(doc.getString("fuelType"));

        Number capacity = doc.get("capacity", Number.class);
        device.setCapacity(capacity != null ? capacity.doubleValue() : null);

        Number power = doc.get("power", Number.class);
        device.setPower(power != null ? power.doubleValue() : null);

        device.setNote(doc.getString("note"));

        String deptId = MongoIdUtils.extractId(doc.get("department"));
        if (deptId != null) {
            departmentRepository.findByMongoId(deptId).ifPresent(device::setDepartment);
        }

        String categoryId = MongoIdUtils.extractId(doc.get("category"));
        if (categoryId != null) {
            deviceTypeRepository.findByMongoId(categoryId).ifPresent(device::setCategory);
        }

        String materialId = MongoIdUtils.extractId(doc.get("material"));
        if (materialId != null) {
            deviceModelRepository.findByMongoId(materialId).ifPresent(device::setMaterial);
        }

        String status = doc.getString("status");
        try {
            device.setStatus(status != null ? DeviceStatus.valueOf(status.toUpperCase()) : DeviceStatus.AVAILABLE);
        } catch (IllegalArgumentException e) {
            device.setStatus(DeviceStatus.AVAILABLE);
        }

        Document coordDoc = doc.get("coordinates", Document.class);
        if (coordDoc != null) {
            List<?> coords = coordDoc.getList("coordinates", Object.class);
            Coordinates coordinates = new Coordinates();
            if (coords != null && coords.size() == 2) {
                coordinates.setLongitude(toDouble(coords.get(0)));
                coordinates.setLatitude(toDouble(coords.get(1)));
            }
            device.setCoordinates(coordinates);
        }

        List<Document> filesDoc = doc.getList("files", Document.class);
        if (filesDoc != null) {
            device.getFiles().clear();
            filesDoc.forEach(f -> {
                DeviceFile file = new DeviceFile();
                file.setKey(f.getString("key"));
                file.setFileName(f.getString("fileName"));
                device.getFiles().add(file);
            });
        }

        deviceRepository.save(device);
    }

    private Double toDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
