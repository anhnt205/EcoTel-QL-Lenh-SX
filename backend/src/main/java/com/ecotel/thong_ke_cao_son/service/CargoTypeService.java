package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.CargoTypeRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.CargoTypeMapper;
import com.ecotel.thong_ke_cao_son.model.CargoGroup;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.repository.CargoGroupRepository;
import com.ecotel.thong_ke_cao_son.repository.CargoTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Danh mục Chủng loại hàng. */
@Service
@RequiredArgsConstructor
public class CargoTypeService {

    private final CargoTypeRepository cargoTypeRepository;
    private final CargoGroupRepository cargoGroupRepository;
    private final CargoTypeMapper cargoTypeMapper;

    @Transactional(readOnly = true)
    public PageResponse<CargoTypeResponse> getAll(String keyword, Pageable pageable) {
        Page<CargoTypeResponse> page = cargoTypeRepository.search(keyword, pageable)
                .map(cargoTypeMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public CargoTypeResponse getById(Long id) {
        return cargoTypeMapper.toResponse(find(id));
    }

    /** Nguồn cho combobox "Sản phẩm nghiệm thu". */
    @Transactional(readOnly = true)
    public List<String> getAcceptanceProducts() {
        return cargoTypeRepository.findDistinctAcceptanceProducts();
    }

    /** Nguồn cho combobox "TTL CLH". */
    @Transactional(readOnly = true)
    public List<String> getTtlClhOptions() {
        return cargoTypeRepository.findDistinctTtlClh();
    }

    @Transactional
    public CargoTypeResponse create(CargoTypeRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        CargoType entity = cargoTypeMapper.toEntity(request);
        entity.setCargoGroup(findGroup(request.getCargoGroupId()));
        return cargoTypeMapper.toResponse(cargoTypeRepository.save(entity));
    }

    @Transactional
    public List<CargoTypeResponse> bulkCreate(List<CargoTypeRequest> requests) {
        // Ràng buộc UNIQUE của DB không bắt được trùng giữa các dòng của
        // CÙNG một lần insert -> phải chặn ở đây.
        List<String> codes = requests.stream().map(CargoTypeRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã chủng loại hàng bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        List<CargoType> entities = requests.stream().map(r -> {
            CargoType e = cargoTypeMapper.toEntity(r);
            e.setCargoGroup(findGroup(r.getCargoGroupId()));
            return e;
        }).toList();
        return cargoTypeRepository.saveAll(entities).stream()
                .map(cargoTypeMapper::toResponse).toList();
    }

    @Transactional
    public CargoTypeResponse update(Long id, CargoTypeRequest request) {
        CargoType entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        cargoTypeMapper.updateEntity(entity, request);
        entity.setCargoGroup(findGroup(request.getCargoGroupId()));
        return cargoTypeMapper.toResponse(cargoTypeRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        cargoTypeRepository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<CargoType> found = cargoTypeRepository.findAllById(ids);
        cargoTypeRepository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private CargoType find(Long id) {
        return cargoTypeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy chủng loại hàng với id: " + id));
    }

    private CargoGroup findGroup(Long id) {
        return cargoGroupRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy nhóm chủng loại hàng với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? cargoTypeRepository.findByCode(code).isPresent()
                : cargoTypeRepository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã chủng loại hàng đã tồn tại: " + code);
        }
    }
}
