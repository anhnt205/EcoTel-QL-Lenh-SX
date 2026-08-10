package com.ecotel.thong_ke_cao_son.sync;

import org.bson.Document;
import org.bson.types.ObjectId;

public final class MongoIdUtils {

    private MongoIdUtils() {}

    public static String extractId(Document doc) {
        Object rawId = doc.get("_id");
        return extractId(rawId);
    }

    public static String extractId(Object rawId) {
        if (rawId instanceof ObjectId objectId) {
            return objectId.toString();
        }
        if (rawId != null) {
            return rawId.toString();
        }
        return null;
    }
}
