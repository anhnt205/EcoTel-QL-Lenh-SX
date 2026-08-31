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
import java.time.LocalDate;
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
        return buildGrid(findDefinition(code));
    }

    /** Lưới có hiệu lực tại một ngày — engine tính sản lượng dùng bản này. */
    @Transactional(readOnly = true)
    public MatrixGridResponse getGridAt(String code, LocalDate date) {
        return buildGrid(findDefinitionAt(code, date));
    }

    /** Lưới của ĐÚNG một phiên bản, chọn theo id. */
    @Transactional(readOnly = true)
    public MatrixGridResponse getGridByVersion(Long definitionId) {
        return buildGrid(definitionRepository.findById(definitionId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy phiên bản lưới id: " + definitionId)));
    }

    private MatrixGridResponse buildGrid(MatrixDefinition def) {
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

    /** Mọi phiên bản của một lưới, mới nhất trước — cho ô chọn phiên bản. */
    @Transactional(readOnly = true)
    public List<MatrixGridResponse> listVersions(String code) {
        return definitionRepository.findVersions(code).stream()
                .map(d -> baseBuilder(d).rows(List.of()).cols(List.of()).cells(Map.of()).build())
                .toList();
    }

    /**
     * Tạo PHIÊN BẢN MỚI của một lưới, sao chép nguyên trục và ô từ phiên bản
     * nguồn.
     *
     * <p>Đây là điểm mấu chốt để việc khai định mức theo tháng khả thi: lưới
     * Định mức nhiên liệu có hàng nghìn ô, bắt nhập lại từ đầu mỗi tháng là
     * không dùng được. Sao chép rồi sửa vài chỗ thay đổi mới là cách làm thật.
     *
     * <p>Phiên bản cũ được <b>đóng lại</b> ở ngày liền trước ngày bắt đầu của
     * phiên bản mới, nếu nó đang để mở. Không đóng thì hai phiên bản cùng có
     * hiệu lực và việc tra sẽ phụ thuộc thứ tự — thứ không nên để tuỳ may rủi.
     *
     * @param sourceId phiên bản nguồn; để trống thì lấy phiên bản mới nhất
     */
    @Transactional
    public MatrixGridResponse createVersion(String code, Long sourceId, LocalDate effectiveFrom,
                                            LocalDate effectiveTo, String versionLabel,
                                            boolean copyCells) {
        if (effectiveFrom == null) {
            throw new BadRequestException("Phiên bản mới phải có ngày bắt đầu hiệu lực");
        }
        if (effectiveTo != null && effectiveTo.isBefore(effectiveFrom)) {
            throw new BadRequestException("\"Đến ngày\" phải sau \"Từ ngày\"");
        }

        MatrixDefinition source = sourceId != null
                ? definitionRepository.findById(sourceId).orElseThrow(
                        () -> new ResourceNotFoundException("Không tìm thấy phiên bản nguồn id: " + sourceId))
                : findDefinition(code);

        if (!source.getCode().equals(code)) {
            throw new BadRequestException("Phiên bản nguồn thuộc lưới khác: " + source.getCode());
        }
        boolean duplicated = definitionRepository.findVersions(code).stream()
                .anyMatch(v -> effectiveFrom.equals(v.getEffectiveFrom()));
        if (duplicated) {
            throw new BadRequestException("Đã có phiên bản bắt đầu từ ngày " + effectiveFrom);
        }

        MatrixDefinition copy = new MatrixDefinition();
        copy.setCode(code);
        copy.setName(source.getName());
        copy.setRowAxisLabel(source.getRowAxisLabel());
        copy.setColAxisLabel(source.getColAxisLabel());
        copy.setValueLabel(source.getValueLabel());
        copy.setRowSourcePath(source.getRowSourcePath());
        copy.setColSourcePath(source.getColSourcePath());
        copy.setNumericRowAxis(source.isNumericRowAxis());
        copy.setNumericColAxis(source.isNumericColAxis());
        copy.setValueScale(source.getValueScale());
        copy.setNote(source.getNote());
        copy.setEffectiveFrom(effectiveFrom);
        copy.setEffectiveTo(effectiveTo);
        copy.setVersionLabel(versionLabel);
        definitionRepository.save(copy);

        // Trục luôn sao chép: một phiên bản không có trục thì không nhập được.
        List<MatrixAxisEntry> newAxes = new ArrayList<>();
        for (MatrixAxisEntry e : axisRepository.findByDefinitionId(source.getId())) {
            MatrixAxisEntry n = new MatrixAxisEntry();
            n.setDefinition(copy);
            n.setAxis(e.getAxis());
            n.setKey(e.getKey());
            n.setLabel(e.getLabel());
            n.setNumericValue(e.getNumericValue());
            n.setSortOrder(e.getSortOrder());
            newAxes.add(n);
        }
        axisRepository.saveAll(newAxes);

        if (copyCells) {
            List<MatrixCell> newCells = new ArrayList<>();
            for (MatrixCell c : cellRepository.findByDefinitionId(source.getId())) {
                MatrixCell n = new MatrixCell();
                n.setDefinition(copy);
                n.setRowKey(c.getRowKey());
                n.setColKey(c.getColKey());
                n.setValue(c.getValue());
                newCells.add(n);
            }
            cellRepository.saveAll(newCells);
        }

        // Đóng phiên bản nguồn nếu nó đang để mở.
        if (source.getEffectiveTo() == null
                && (source.getEffectiveFrom() == null || source.getEffectiveFrom().isBefore(effectiveFrom))) {
            source.setEffectiveTo(effectiveFrom.minusDays(1));
            definitionRepository.save(source);
        }

        return buildGrid(copy);
    }

    /**
     * Xoá một PHIÊN BẢN của lưới, kèm toàn bộ trục và ô của nó.
     *
     * <p>Hai chốt chặn:
     *
     * <ol>
     *   <li><b>Không cho xoá phiên bản cuối cùng.</b> Lưới không còn phiên bản
     *       nào thì engine tính sản lượng mất bảng tra và màn danh mục không
     *       còn gì để mở — muốn bỏ hẳn một lưới là việc khác, không phải xoá
     *       phiên bản.
     *   <li><b>Mở lại phiên bản liền trước.</b> Khi tạo phiên bản mới, hệ đã
     *       đóng phiên bản cũ ở ngày liền trước; xoá đi mà không mở lại sẽ để
     *       thủng một khoảng thời gian không phiên bản nào phủ, và báo cáo rơi
     *       vào khoảng đó sẽ báo thiếu dữ liệu. Đây đúng là phép nghịch của
     *       {@link #createVersion}.
     * </ol>
     */
    @Transactional
    public void deleteVersion(String code, Long versionId) {
        MatrixDefinition target = definitionRepository.findById(versionId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy phiên bản lưới id: " + versionId));
        if (!target.getCode().equals(code)) {
            throw new BadRequestException("Phiên bản này thuộc lưới khác: " + target.getCode());
        }

        List<MatrixDefinition> versions = definitionRepository.findVersions(code);
        if (versions.size() <= 1) {
            throw new BadRequestException(
                    "Không thể xoá phiên bản cuối cùng của lưới \"" + target.getName()
                            + "\" — lưới phải luôn còn ít nhất một phiên bản.");
        }

        // Mở lại phiên bản liền trước nếu chính nó đã bị đóng để nhường chỗ.
        if (target.getEffectiveFrom() != null) {
            LocalDate closedAt = target.getEffectiveFrom().minusDays(1);
            versions.stream()
                    .filter(v -> !v.getId().equals(target.getId()))
                    .filter(v -> closedAt.equals(v.getEffectiveTo()))
                    .findFirst()
                    .ifPresent(prev -> {
                        prev.setEffectiveTo(target.getEffectiveTo());
                        definitionRepository.save(prev);
                    });
        }

        cellRepository.deleteByDefinitionId(target.getId());
        axisRepository.deleteByDefinitionId(target.getId());
        definitionRepository.delete(target);
    }

    /**
     * Tra giá trị một ô của lưới — điểm vào cho engine tính sản lượng.
     *
     * <p>Ô chưa khai báo thì ném lỗi nghiệp vụ rõ ràng, KHÔNG trả 0: trả 0 sẽ
     * cho ra sản lượng bằng 0 mà không ai biết là do thiếu khai báo lưới.
     */
    @Transactional(readOnly = true)
    public BigDecimal requireCell(String code, String rowKey, String colKey, LocalDate date) {
        MatrixDefinition def = findDefinitionAt(code, date);
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
    public int upsertCells(String code, Long versionId, List<MatrixCellUpsertRequest> requests) {
        MatrixDefinition def = resolveTarget(code, versionId);

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
    public MatrixGridResponse addAxisEntries(String code, Long versionId, MatrixAxisEntry.Axis axis,
                                             List<MatrixAxisEntryRequest> requests) {
        MatrixDefinition def = resolveTarget(code, versionId);
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
        return buildGrid(def);
    }

    /** Xoá một dòng/cột kèm toàn bộ ô của nó — ô còn lại sẽ là ô mồ côi. */
    @Transactional
    public MatrixGridResponse removeAxisEntry(String code, Long versionId, MatrixAxisEntry.Axis axis, String key) {
        MatrixDefinition def = resolveTarget(code, versionId);
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
        return buildGrid(def);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    private MatrixGridResponse.MatrixGridResponseBuilder baseBuilder(MatrixDefinition d) {
        return MatrixGridResponse.builder()
                .versionId(d.getId())
                .effectiveFrom(d.getEffectiveFrom())
                .effectiveTo(d.getEffectiveTo())
                .versionLabel(d.getVersionLabel())
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

    /**
     * Phiên bản mà thao tác SỬA sẽ nhắm vào: phiên bản được chỉ định, không
     * thì phiên bản mới nhất.
     *
     * <p>Bắt buộc phải đúng phiên bản đang xem — nếu không, người dùng mở
     * phiên bản tháng trước để đối chiếu rồi sửa một ô sẽ vô tình ghi vào
     * phiên bản hiện hành.
     */
    private MatrixDefinition resolveTarget(String code, Long versionId) {
        if (versionId == null) return findDefinition(code);
        MatrixDefinition def = definitionRepository.findById(versionId).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy phiên bản lưới id: " + versionId));
        if (!def.getCode().equals(code)) {
            throw new BadRequestException("Phiên bản id=" + versionId + " không thuộc lưới " + code);
        }
        return def;
    }

    /**
     * Phiên bản MỚI NHẤT của một lưới — dùng cho màn hình khi người dùng chưa
     * chọn phiên bản cụ thể.
     */
    private MatrixDefinition findDefinition(String code) {
        List<MatrixDefinition> versions = definitionRepository.findVersions(code);
        if (versions.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy lưới danh mục: " + code);
        }
        return versions.get(0);
    }

    /**
     * Phiên bản có hiệu lực tại một ngày — dùng cho ENGINE tính sản lượng.
     *
     * <p>Tra theo ngày sản xuất, cùng nguyên tắc với danh mục Tỷ trọng
     * (QĐ-04): chạy lại báo cáo tháng cũ phải ra đúng con số cũ, kể cả sau
     * khi định mức đã được khai lại cho tháng mới.
     */
    private MatrixDefinition findDefinitionAt(String code, LocalDate date) {
        if (date == null) return findDefinition(code);
        List<MatrixDefinition> versions = definitionRepository.findEffective(code, date);
        if (versions.isEmpty()) {
            throw new ResourceNotFoundException("Lưới " + code
                    + " chưa có phiên bản nào có hiệu lực ngày " + date);
        }
        return versions.get(0);
    }
}
