package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.DeviceType;
import com.ecotel.thong_ke_cao_son.repository.DeviceRepository;
import com.ecotel.thong_ke_cao_son.repository.DeviceTypeRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

/**
 * Đồng bộ danh mục thiết bị từ QL-TAISAN (nguồn gốc duy nhất cho thiết bị/xe
 * máy) — QL-TAISAN là bên tạo/sửa thông tin gốc (tên, loại, công suất...),
 * Thống kê Cao Sơn chỉ đọc về và tự quản riêng phần vận hành/tính sản lượng
 * (status, coordinates, note, files, và đặc biệt là các field chỉ có nghĩa
 * với engine tính định mức nhiên liệu của CHÍNH hệ thống này: fuelClass,
 * vehicleType, vehicleRank, categoryClass, bucketCapacity, carRenovation,
 * qualityLevel — QL-TAISAN không biết gì về các khái niệm này, tuyệt đối
 * không đụng khi đồng bộ) — cùng cách làm với Điều phối máy móc để giảm rủi
 * ro (chủ dự án xác nhận 2026-09-29, đổi từ quyết định "thay thế hoàn toàn"
 * ban đầu).
 *
 * Xác thực bằng X-Service-Key (service-to-service, không nhân danh user cụ
 * thể) — xem ServiceKeyAuthFilter bên QL-TAISAN.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaiSanSyncService {

    private final DeviceRepository deviceRepository;
    private final DeviceTypeRepository deviceTypeRepository;
    private final RestTemplate restTemplate;

    @Value("${taisan.api-base-url:}")
    private String baseUrl;

    @Value("${taisan.service-key:}")
    private String serviceKey;

    @Value("${taisan.id-cong-ty:}")
    private String idCongTy;

    public record SyncResult(int total, int created, int updated, int skipped) {
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TaiSanDto {
        private String id;
        private String tenTaiSan;
        private String kyHieu;
        private String soKyHieu;
        private String congSuat;
        private String idNhomTaiSan;
        private String tenNhom;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ApiResponseDto {
        private Boolean success;
        private String message;
        private List<TaiSanDto> data;
    }

    public SyncResult sync() {
        if (baseUrl.isBlank() || serviceKey.isBlank() || idCongTy.isBlank()) {
            throw new IllegalStateException(
                    "Thiếu cấu hình taisan.api-base-url / taisan.service-key / taisan.id-cong-ty");
        }

        List<TaiSanDto> list = fetchTaiSanList();

        int created = 0;
        int updated = 0;
        int skipped = 0;

        for (TaiSanDto ts : list) {
            if (ts.getId() == null || ts.getId().isBlank()) {
                skipped++;
                continue;
            }

            DeviceType category = upsertDeviceType(ts.getTenNhom(), ts.getIdNhomTaiSan());
            Double power = parsePowerNumber(ts.getCongSuat());

            Device device = deviceRepository.findByExternalTaiSanId(ts.getId()).orElse(null);
            boolean isNew = device == null;
            if (isNew) {
                device = new Device();
                device.setExternalTaiSanId(ts.getId());
                device.setStatus(DeviceStatus.AVAILABLE);
            }

            // CHỈ set các trường "gốc" lấy từ Tài sản — KHÔNG đụng tới
            // status/coordinates/note/files/fuelClass/vehicleType/vehicleRank/
            // categoryClass/bucketCapacity/carRenovation/qualityLevel (Thống
            // kê tự quản riêng, xem javadoc lớp này).
            device.setName(ts.getTenTaiSan());
            device.setCode(firstNonBlank(ts.getSoKyHieu(), ts.getKyHieu(), ts.getId()));
            device.setVehicleNumber(ts.getKyHieu());
            if (category != null) device.setCategory(category);
            if (power != null) device.setPower(power);

            deviceRepository.save(device);
            if (isNew) created++;
            else updated++;
        }

        log.info("Đồng bộ thiết bị từ QL-TAISAN: total={}, created={}, updated={}, skipped={}",
                list.size(), created, updated, skipped);
        return new SyncResult(list.size(), created, updated, skipped);
    }

    private List<TaiSanDto> fetchTaiSanList() {
        String url = UriComponentsBuilder.fromUriString(baseUrl + "/api/taisan")
                .queryParam("idcongty", idCongTy)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Service-Key", serviceKey);

        ResponseEntity<ApiResponseDto> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), ApiResponseDto.class);

        ApiResponseDto body = response.getBody();
        if (body == null || !Boolean.TRUE.equals(body.getSuccess())) {
            String message = body != null ? body.getMessage() : "Không có phản hồi";
            throw new IllegalStateException("QL-TAISAN trả về lỗi: " + message);
        }
        return body.getData() != null ? body.getData() : List.of();
    }

    private DeviceType upsertDeviceType(String tenNhom, String idNhomTaiSan) {
        if (tenNhom == null || tenNhom.isBlank() || idNhomTaiSan == null || idNhomTaiSan.isBlank()) {
            return null;
        }
        DeviceType type = deviceTypeRepository.findByExternalNhomTaiSanId(idNhomTaiSan)
                .orElseGet(() -> {
                    DeviceType t = new DeviceType();
                    t.setExternalNhomTaiSanId(idNhomTaiSan);
                    return t;
                });
        type.setName(tenNhom);
        return deviceTypeRepository.save(type);
    }

    // congSuat bên TaiSan là chuỗi tự do (vd. "150 HP", "12 tấn") — chỉ lấy
    // được số nếu chuỗi đó parse thẳng ra number, còn lại bỏ qua thay vì cố
    // ép về number rồi sai lệch đơn vị.
    private Double parsePowerNumber(String congSuat) {
        if (congSuat == null || congSuat.isBlank()) return null;
        try {
            return Double.parseDouble(congSuat.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
