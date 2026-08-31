package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.MatrixAxisEntryRequest;
import com.ecotel.thong_ke_cao_son.dto.request.MatrixCellUpsertRequest;
import com.ecotel.thong_ke_cao_son.dto.response.MatrixGridResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.model.MatrixAxisEntry;
import com.ecotel.thong_ke_cao_son.model.MatrixCell;
import com.ecotel.thong_ke_cao_son.model.MatrixDefinition;
import com.ecotel.thong_ke_cao_son.repository.MatrixAxisEntryRepository;
import com.ecotel.thong_ke_cao_son.repository.MatrixCellRepository;
import com.ecotel.thong_ke_cao_son.repository.MatrixDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Danh mục dạng LƯỚI (bảng tra hai chiều) — xem {@link MatrixDefinition}.
 */
@Service
@RequiredArgsConstructor
public class MatrixCatalogService {

    private final MatrixDefinitionRepository definitionRepository;
    private final MatrixAxisEntryRepository axisRepository;
    private final MatrixCellRepository cellRepository;

    @Transactional(readOnly = true)
    public List<MatrixGridResponse> listDefinitions() {
        // Chỉ phần khai báo, không kèm ô — dùng cho màn danh sách các lưới.
        return definitionRepository.findAllByOrderByIdAsc().stream()
                .map(d -> baseBuilder(d).rows(List.of()).cols(List.of()).cells(Map.of()).build())
                .toList();
    }

    @Transactional(readOnly = true)
    public MatrixGridResponse getGrid(String code) {
        MatrixDefinition def = findDefinition(code);
        List<MatrixAxisEntry> entries = axisRepository.findByDefinitionId(def.getId());

        List<MatrixGridResponse.AxisEntry> rows = sortAxis(
                entries.stream().filter(e -> e.getAxis() == MatrixAxisEntry.Axis.ROW).toList(),
                def.isNumericRowAxis());
        List<MatrixGridResponse.AxisEntry> cols = sortAxis(
                entries.stream().filter(e -> e.getAxis() == MatrixAxisEntry.Axis.COL).toList(),
                def.isNumericColAxis());

        Map<String, Map<String, BigDecimal>> cells = new LinkedHashMap<>();
        for (MatrixCell c : cellRepository.findByDefinitionId(def.getId())) {
            cells.computeIfAbsent(c.getRowKey(), k -> new LinkedHashMap<>())
                    .put(c.getColKey(), c.getValue());
        }

        return baseBuilder(def).rows(rows).cols(cols).cells(cells).build();
    }

    /**
     * Tra giá trị một ô của lưới — điểm vào cho engine tính sản lượng.
     *
     * <p>Ô chưa khai báo thì ném lỗi nghiệp vụ rõ ràng, KHÔNG trả 0: trả 0 sẽ
     * cho ra sản lượng bằng 0 mà không ai biết là do thiếu khai báo lưới.
     */
    @Transactional(readOnly = true)
    public BigDecimal requireCell(String code, String rowKey, String colKey) {
        MatrixDefinition def = findDefinition(code);
        return cellRepository.findByDefinitionIdAndRowKeyAndColKey(def.getId(), rowKey, colKey)
                .map(MatrixCell::getValue)
                .orElseThrow(() -> new BadRequestException("Lưới " + def.getName()
                        + " chưa khai báo ô [" + rowKey + " × " + colKey + "]"));
    }

    /**
     * Ghi nhiều ô một lần.
     *
     * <p>Màn lưới gửi lên đúng những ô người dùng vừa sửa, nên phải là thao
     * tác gộp: sửa 200 ô mà gọi 200 lần thì vừa chậm vừa có nguy cơ lưu được
     * một nửa.
     *
     * @return số ô đã ghi hoặc xoá
     */
    @Transactional
    public int upsertCells(String code, List<MatrixCellUpsertRequest> requests) {
        MatrixDefinition def = findDefinition(code);

        // Chỉ cho ghi vào dòng/cột đã khai báo trên trục. Không có bước này
        // thì gõ sai một mã sẽ lặng lẽ tạo ra ô "mồ côi" mà lưới không hiện,
        // và công thức thì không bao giờ tìm thấy.
        Set<String> rowKeys = new HashSet<>();
        Set<String> colKeys = new HashSet<>();
        for (MatrixAxisEntry e : axisRepository.findByDefinitionId(def.getId())) {
            (e.getAxis() == MatrixAxisEntry.Axis.ROW ? rowKeys : colKeys).add(e.getKey());
        }

        // Nạp sẵn ô hiện có để không phải truy vấn từng ô một.
        Map<String, MatrixCell> existing = new HashMap<>();
        for (MatrixCell c : cellRepository.findByDefinitionId(def.getId())) {
            existing.put(cellKey(c.getRowKey(), c.getColKey()), c);
        }

        List<MatrixCell> toSave = new ArrayList<>();
        List<MatrixCell> toDelete = new ArrayList<>();

        for (MatrixCellUpsertRequest r : requests) {
            String rowKey = r.getRowKey().trim();
            String colKey = r.getColKey().trim();
            if (!rowKeys.contains(rowKey)) {
                throw new BadRequestException("Dòng \"" + rowKey + "\" chưa có trong lưới " + code);
            }
            if (!colKeys.contains(colKey)) {
                throw new BadRequestException("Cột \"" + colKey + "\" chưa có trong lưới " + code);
            }

            MatrixCell cell = existing.get(cellKey(rowKey, colKey));
            if (r.getValue() == null) {
                // null = trả ô về trạng thái CHƯA khai báo, khác hẳn ghi số 0.
                if (cell != null) toDelete.add(cell);
                continue;
            }
            if (cell == null) {
                cell = new MatrixCell();
                cell.setDefinition(def);
                cell.setRowKey(rowKey);
                cell.setColKey(colKey);
            }
            cell.setValue(r.getValue());
            toSave.add(cell);
        }

        cellRepository.saveAll(toSave);
        cellRepository.deleteAll(toDelete);
        return toSave.size() + toDelete.size();
    }

    @Transactional
    public MatrixGridResponse addAxisEntries(String code, MatrixAxisEntry.Axis axis,
                                             List<MatrixAxisEntryRequest> requests) {
        MatrixDefinition def = findDefinition(code);
        boolean numeric = axis == MatrixAxisEntry.Axis.ROW ? def.isNumericRowAxis() : def.isNumericColAxis();

        Set<String> present = new HashSet<>();
        int maxOrder = 0;
        for (MatrixAxisEntry e : axisRepository.findByDefinitionId(def.getId())) {
            if (e.getAxis() == axis) {
                present.add(e.getKey());
                maxOrder = Math.max(maxOrder, e.getSortOrder());
            }
        }

        List<MatrixAxisEntry> toSave = new ArrayList<>();
        for (MatrixAxisEntryRequest r : requests) {
            String key = r.getKey().trim();
            // Bỏ qua khoá đã có thay vì báo lỗi: người dùng thường chọn cả
            // danh mục nguồn để bổ sung phần còn thiếu, chặn cứng ở đây sẽ
            // khiến thao tác đó không bao giờ thành công.
            if (key.isEmpty() || !present.add(key)) continue;

            MatrixAxisEntry e = new MatrixAxisEntry();
            e.setDefinition(def);
            e.setAxis(axis);
            e.setKey(key);
            e.setLabel(r.getLabel() != null && !r.getLabel().isBlank() ? r.getLabel().trim() : key);
            e.setSortOrder(r.getSortOrder() != null ? r.getSortOrder() : ++maxOrder);

            BigDecimal numericValue = r.getNumericValue() != null ? r.getNumericValue() : parseNumber(key);
            if (numeric && numericValue == null) {
                throw new BadRequestException(
                        "Trục này là trục SỐ, nhưng \"" + key + "\" không đọc được thành số.");
            }
            e.setNumericValue(numericValue);
            toSave.add(e);
        }
        axisRepository.saveAll(toSave);
        return getGrid(code);
    }

    /** Xoá một dòng/cột kèm toàn bộ ô của nó — ô còn lại sẽ là ô mồ côi. */
    @Transactional
    public MatrixGridResponse removeAxisEntry(String code, MatrixAxisEntry.Axis axis, String key) {
        MatrixDefinition def = findDefinition(code);
        int removed = axisRepository.deleteEntry(def.getId(), axis, key);
        if (removed == 0) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy " + (axis == MatrixAxisEntry.Axis.ROW ? "dòng" : "cột") + " \"" + key + "\"");
        }
        if (axis == MatrixAxisEntry.Axis.ROW) {
            cellRepository.deleteByRowKey(def.getId(), key);
        } else {
            cellRepository.deleteByColKey(def.getId(), key);
        }
        return getGrid(code);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private MatrixGridResponse.MatrixGridResponseBuilder baseBuilder(MatrixDefinition d) {
        return MatrixGridResponse.builder()
                .code(d.getCode())
                .name(d.getName())
                .rowAxisLabel(d.getRowAxisLabel())
                .colAxisLabel(d.getColAxisLabel())
                .valueLabel(d.getValueLabel())
                .rowSourcePath(d.getRowSourcePath())
                .colSourcePath(d.getColSourcePath())
                .numericRowAxis(d.isNumericRowAxis())
                .numericColAxis(d.isNumericColAxis())
                .valueScale(d.getValueScale())
                .note(d.getNote());
    }

    /**
     * Trục số sắp theo GIÁ TRỊ SỐ, trục thường sắp theo thứ tự khai báo.
     *
     * <p>Với Định mức nhiên liệu, thứ tự số không chỉ để nhìn cho đẹp: phép
     * nội suy lấy hai dải kề nhau, sắp theo chuỗi sẽ cho "10" đứng trước "9"
     * và chọn nhầm dải.
     */
    private List<MatrixGridResponse.AxisEntry> sortAxis(List<MatrixAxisEntry> entries, boolean numeric) {
        Comparator<MatrixAxisEntry> cmp = numeric
                ? Comparator.comparing(MatrixAxisEntry::getNumericValue,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                : Comparator.comparingInt(MatrixAxisEntry::getSortOrder)
                        .thenComparing(MatrixAxisEntry::getKey);
        return entries.stream().sorted(cmp)
                .map(e -> MatrixGridResponse.AxisEntry.builder()
                        .key(e.getKey())
                        .label(e.getLabel() != null ? e.getLabel() : e.getKey())
                        .numericValue(e.getNumericValue())
                        .sortOrder(e.getSortOrder())
                        .build())
                .toList();
    }

    private static BigDecimal parseNumber(String raw) {
        try {
            return new BigDecimal(raw.trim().replace(",", "."));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /**
     * Ký tự ngăn cách khi ghép khoá ô trong bộ nhớ tạm: Unit Separator (31),
     * không hợp lệ trong mã danh mục nên chắc chắn không đụng.
     *
     * <p>Không dùng dấu cách hay gạch dưới — mã thật có cả hai (vd
     * {@code CAT 777E}, {@code PA.PCMB_S+90}), nên {@code "A B"+"C"} sẽ đụng
     * khoá với {@code "A"+"B C"} và ghi đè nhầm ô.
     */
    private static final char KEY_SEPARATOR = (char) 31;

    private static String cellKey(String rowKey, String colKey) {
        return rowKey + KEY_SEPARATOR + colKey;
    }

    private MatrixDefinition findDefinition(String code) {
        return definitionRepository.findByCode(code).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy lưới danh mục: " + code));
    }
}
