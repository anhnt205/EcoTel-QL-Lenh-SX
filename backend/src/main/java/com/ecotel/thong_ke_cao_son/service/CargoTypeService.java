package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.CargoTypeMapper;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.repository.CargoTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CargoTypeService {

    private final CargoTypeRepository cargoTypeRepository;
    private final CargoTypeMapper cargoTypeMapper;

    public Page<CargoTypeResponse> getAll(String keyword, Pageable pageable) {
        return cargoTypeRepository.search(keyword, pageable)
                .map(cargoTypeMapper::toResponse);
    }

    public CargoTypeResponse getById(Long id) {
        CargoType cargoType = cargoTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CargoType not found with id: " + id));
        return cargoTypeMapper.toResponse(cargoType);
    }
}
