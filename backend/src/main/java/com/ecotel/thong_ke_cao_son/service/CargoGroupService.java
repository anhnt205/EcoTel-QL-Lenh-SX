package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.response.CargoGroupResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.CargoGroupMapper;
import com.ecotel.thong_ke_cao_son.model.CargoGroup;
import com.ecotel.thong_ke_cao_son.repository.CargoGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CargoGroupService {

    private final CargoGroupRepository cargoGroupRepository;
    private final CargoGroupMapper cargoGroupMapper;

    public Page<CargoGroupResponse> getAll(String keyword, Pageable pageable) {
        return cargoGroupRepository.search(keyword, pageable)
                .map(cargoGroupMapper::toResponse);
    }

    public CargoGroupResponse getById(Long id) {
        CargoGroup cargoGroup = cargoGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CargoGroup not found with id: " + id));
        return cargoGroupMapper.toResponse(cargoGroup);
    }
}
