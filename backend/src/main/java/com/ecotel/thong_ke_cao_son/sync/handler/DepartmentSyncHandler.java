package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.repository.DepartmentRepository;
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
public class DepartmentSyncHandler implements MongoSyncHandler {

    private final DepartmentRepository departmentRepository;

    @Override
    public String collectionName() {
        return "departments";
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
        departmentRepository.findByMongoId(mongoId).ifPresent(departmentRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        Department department = departmentRepository.findByMongoId(mongoId).orElseGet(Department::new);
        department.setMongoId(mongoId);
        department.setName(doc.getString("name"));
        department.setCode(doc.getString("code"));
        department.setDescription(doc.getString("description"));
        departmentRepository.save(department);
    }
}
