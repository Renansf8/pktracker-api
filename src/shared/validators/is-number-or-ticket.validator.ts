import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsNumberOrTicket(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNumberOrTicket',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a number or the string "ticket"`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return value === 'ticket' || (typeof value === 'number' && isFinite(value));
        },
      },
    });
  };
}
