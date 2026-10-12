package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.response.LocationResponse;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.LocationMapper;
import com.ecotel.thong_ke_cao_son.model.Location;
import com.ecotel.thong_ke_cao_son.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final LocationMapper locationMapper;

    public PageResponse<LocationResponse> getAll(String keyword, Pageable pageable) {
        Page<LocationResponse> page = locationRepository.search(keyword, pageable)
                .map(locationMapper::toResponse);
        return PageResponse.from(page);
    }

    public LocationResponse getById(Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found with id: " + id));
        return locationMapper.toResponse(location);
    }
}
