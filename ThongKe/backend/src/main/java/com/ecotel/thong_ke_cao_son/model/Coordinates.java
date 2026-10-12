package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Coordinates {

    @Column(name = "longitude")
    private Double longitude = 0.0;

    @Column(name = "latitude")
    private Double latitude = 0.0;
}
