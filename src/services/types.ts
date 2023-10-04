export type Snapshot = {
  serviceType: string;
  // Map from base id to snapshot.
  bases: Record<string, BaseSnapshot>;
};

export type BaseSnapshot = {
  baseId: string;
  // Map from record id to a record blob.
  records: Record<string, RecordWithCollection>;
};

export type RecordWithCollection = {
  collectionId: string;
  itemId: string;
  fields: { [x: string]: unknown };
};
