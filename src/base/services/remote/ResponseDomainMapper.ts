// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Mapper {}

export interface ResponseMapper<DomainModel> extends Mapper {
  mapToDomain(): DomainModel;
}
