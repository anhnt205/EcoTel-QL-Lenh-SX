package com.ecotel.thong_ke_cao_son.sync;

import org.bson.Document;

public interface MongoSyncHandler {

    String collectionName();

    void onInsert(Document doc);

    void onUpdate(Document fullDocumentAfterUpdate);

    void onDelete(String mongoId);
}
