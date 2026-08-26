import { normalizeNullableBlankStrings } from './audit.subscriber';

describe('persistence blank-value normalization', () => {
  it('sets blank values to null only for nullable entity columns', () => {
    const entity: Record<string, unknown> = {
      optionalNote: ' ',
      requiredName: '',
      untouched: 'value',
    };
    const event = {
      entity,
      metadata: {
        columns: [
          { propertyName: 'optionalNote', isNullable: true },
          { propertyName: 'requiredName', isNullable: false },
          { propertyName: 'untouched', isNullable: true },
        ],
      },
    } as any;

    normalizeNullableBlankStrings(event);

    expect(entity).toEqual({ optionalNote: null, requiredName: '', untouched: 'value' });
  });
});
