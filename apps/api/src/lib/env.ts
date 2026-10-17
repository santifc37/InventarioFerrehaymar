export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (value === undefined || value === null || value.trim() === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`La variable de entorno ${name} es obligatoria`);
  }

  return value.trim();
}

export function getEnvNumber(name: string, defaultValue?: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === null || rawValue.trim() === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`La variable de entorno ${name} es obligatoria`);
  }

  const parsed = Number(rawValue.trim());

  if (Number.isNaN(parsed)) {
    throw new Error(`La variable de entorno ${name} debe ser un número válido`);
  }

  return parsed;
}

export function getEnvBoolean(name: string, defaultValue = false): boolean {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === null || rawValue.trim() === '') {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error(`La variable de entorno ${name} debe ser true/false`);
}
