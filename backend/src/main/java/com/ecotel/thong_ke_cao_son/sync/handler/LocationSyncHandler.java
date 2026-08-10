package com.ecotel.thong_ke_cao_son.sync.handler;

import com.ecotel.thong_ke_cao_son.model.Coordinates;
import com.ecotel.thong_ke_cao_son.model.Location;
import com.ecotel.thong_ke_cao_son.repository.LocationRepository;
import com.ecotel.thong_ke_cao_son.sync.MongoIdUtils;
import com.ecotel.thong_ke_cao_son.sync.MongoSyncHandler;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Order(1)
@RequiredArgsConstructor
public class LocationSyncHandler implements MongoSyncHandler {

    private final LocationRepository locationRepository;

    @Override
    public String collectionName() {
        return "locations";
    }

    @Override
    @Transactional
    public void onInsert(Document doc) {
        upsert(doc);
    }

    @Override
    @Transactional
    public void onUpdate(Document doc) {
        upsert(doc);
    }

    @Override
    @Transactional
    public void onDelete(String mongoId) {
        locationRepository.findByMongoId(mongoId).ifPresent(locationRepository::delete);
    }

    private void upsert(Document doc) {
        String mongoId = MongoIdUtils.extractId(doc);
        Location location = locationRepository.findByMongoId(mongoId).orElseGet(Location::new);
        location.setMongoId(mongoId);
        location.setName(doc.getString("name"));

        Number distance = doc.get("distance", Number.class);
        location.setDistance(distance != null ? distance.doubleValue() : null);

        Document coordDoc = doc.get("coordinates", Document.class);
        if (coordDoc != null) {
            List<?> coords = coordDoc.getList("coordinates", Object.class);
            Coordinates coordinates = new Coordinates();
            if (coords != null && coords.size() == 2) {
                coordinates.setLongitude(toDouble(coords.get(0)));
                coordinates.setLatitude(toDouble(coords.get(1)));
            }
            location.setCoordinates(coordinates);
        }
        locationRepository.save(location);
    }

    private Double toDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
