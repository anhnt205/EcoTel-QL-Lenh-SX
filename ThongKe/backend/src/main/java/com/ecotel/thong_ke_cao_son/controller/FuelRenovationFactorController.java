package com.ecotel.thong_ke_cao_son.controller;

import com.ecotel.thong_ke_cao_son.annotation.RequirePermission;
import com.ecotel.thong_ke_cao_son.enums.FuelNormFactorKind;
import com.ecotel.thong_ke_cao_son.service.FuelNormFactorService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục Hệ số ĐMNL theo cải tạo ben. */
@RestController
@RequestMapping("/api/fuel-renovation-factors")
@RequirePermission(resource = "fuel-renovation-factors")
public class FuelRenovationFactorController extends FuelNormFactorControllerBase {

    public FuelRenovationFactorController(FuelNormFactorService service) {
        super(service, FuelNormFactorKind.CAR_RENOVATION);
    }
}
