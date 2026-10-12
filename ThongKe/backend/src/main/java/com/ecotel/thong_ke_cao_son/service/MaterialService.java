package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.response.MaterialResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.MaterialMapper;
import com.ecotel.thong_ke_cao_son.model.Material;
import com.ecotel.thong_ke_cao_son.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final MaterialMapper materialMapper;

    public PageResponse<MaterialResponse> getAll(String keyword, Pageable pageable) {
        Page<MaterialResponse> page = materialRepository.search(keyword, pageable)
                .map(materialMapper::toResponse);
        return PageResponse.from(page);
    }

    public MaterialResponse getById(Long id) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + id));
        return materialMapper.toResponse(material);
    }
}
