package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.User;
import com.ecotel.thong_ke_cao_son.enums.Role;
import com.ecotel.thong_ke_cao_son.repository.DepartmentRepository;
import com.ecotel.thong_ke_cao_son.repository.PositionRepository;
import com.ecotel.thong_ke_cao_son.repository.UserRepository;
import com.ecotel.thong_ke_cao_son.sync.MongoIdUtils;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class UserSyncHandler implements MongoSyncHandler {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    @Override
    public String collectionName() {
        return "users";
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
        userRepository.findByMongoId(mongoId).ifPresent(userRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        String salaryCode = doc.getString("salaryCode");

        // Ưu tiên tìm theo mongoId trước (record đã từng sync)
        User user = userRepository.findByMongoId(mongoId).orElse(null);

        if (user == null) {
            // Chưa từng sync record này — kiểm tra có bị trùng salaryCode với record khác không
            User existingBySalaryCode = userRepository.findBySalaryCode(salaryCode).orElse(null);

            if (existingBySalaryCode != null) {
                // So sánh "độ mới" — document nào mới hơn thì giữ
                if (!isIncomingNewer(doc, existingBySalaryCode)) {
                    log.warn("Bỏ qua user cũ hơn, trùng salaryCode '{}': mongoId={} (giữ mongoId={})",
                            salaryCode, mongoId, existingBySalaryCode.getMongoId());
                    return; // document đang sync CŨ hơn bản đã có -> bỏ qua, không ghi đè
                }
                log.warn("Ghi đè user trùng salaryCode '{}': mongoId cũ={} -> mongoId mới={}",
                        salaryCode, existingBySalaryCode.getMongoId(), mongoId);
                user = existingBySalaryCode; // dùng lại record cũ, cập nhật đè bằng dữ liệu mới hơn
            } else {
                user = new User();
            }
        }

        user.setMongoId(mongoId);
        user.setUsername(doc.getString("username"));
        user.setPassword(doc.getString("password"));
        user.setFullName(doc.getString("fullName"));
        user.setGender(doc.getString("gender"));
        user.setEmail(doc.getString("email"));

        String phone = doc.getString("phone");
        if (phone != null && !phone.matches("^[0-9+\\-\\s]{0,15}$")) {
            phone = null;
        }
        user.setPhone(phone);

        user.setAvatar(doc.getString("avatar"));
        user.setSignature(doc.getString("signature"));
        user.setSalaryCode(salaryCode);

        String deptId = MongoIdUtils.extractId(doc.get("department"));
        if (deptId != null) {
            departmentRepository.findByMongoId(deptId).ifPresent(user::setDepartment);
        }

        String posId = MongoIdUtils.extractId(doc.get("position"));
        if (posId != null) {
            positionRepository.findByMongoId(posId).ifPresent(user::setPosition);
        }

        String role = doc.getString("role");
        try {
            user.setRole(role != null ? Role.valueOf(role.toUpperCase()) : Role.EMPLOYEE);
        } catch (IllegalArgumentException e) {
            user.setRole(Role.EMPLOYEE);
        }

        Boolean active = doc.getBoolean("active");
        user.setActive(active != null ? active : true);

        userRepository.save(user);
    }

    /**
     * So sánh document đang sync với record đã có trong Postgres, xem cái nào "mới" hơn.
     * Ưu tiên updatedAt, fallback createdAt, fallback cuối là timestamp nhúng trong ObjectId.
     */
    private boolean isIncomingNewer(Document incoming, User existing) {
        Date incomingTime = incoming.getDate("updatedAt");
        if (incomingTime == null) {
            incomingTime = incoming.getDate("createdAt");
        }
        if (incomingTime == null) {
            // Fallback: lấy timestamp nhúng sẵn trong ObjectId (12 byte đầu = giây tạo)
            ObjectId oid = incoming.getObjectId("_id");
            incomingTime = oid != null ? new Date(oid.getTimestamp() * 1000L) : new Date(0);
        }

        LocalDateTime existingTime = existing.getUpdatedAt() != null
                ? existing.getUpdatedAt()
                : existing.getCreatedAt();

        if (existingTime == null) {
            return true; // record cũ không có timestamp -> coi như incoming luôn mới hơn
        }

        LocalDateTime incomingLocalTime = LocalDateTime.ofInstant(incomingTime.toInstant(), ZoneId.systemDefault());
        return incomingLocalTime.isAfter(existingTime);
    }
}
