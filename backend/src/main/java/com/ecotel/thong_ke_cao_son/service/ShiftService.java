package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.response.ShiftResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.ShiftMapper;
import com.ecotel.thong_ke_cao_son.model.Shift;
import com.ecotel.thong_ke_cao_son.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final ShiftMapper shiftMapper;

    public PageResponse<ShiftResponse> getAll(String keyword, Pageable pageable) {
        Page<ShiftResponse> page = shiftRepository.search(keyword, pageable)
                .map(shiftMapper::toResponse);
        return PageResponse.from(page);
    }

    public ShiftResponse getById(Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found with id: " + id));
        return shiftMapper.toResponse(shift);
    }
}
