package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục Hệ số ĐMNL theo mùa. */
@RestController
@RequestMapping("/api/fuel-season-factors")
@RequirePermission(resource = "fuel-season-factors")
public class FuelSeasonFactorController extends FuelNormFactorControllerBase {

    public FuelSeasonFactorController(FuelNormFactorService service) {
        super(service, FuelNormFactorKind.SEASON);
    }
}
