import { addDays, differenceInDays } from 'date-fns';
import type { WeatherData, Operation, WeatherType, WeatherOperationCorrelation } from '../types';

const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'stormy'];

const getWeightedWeatherType = (random: number): WeatherType => {
  if (random < 0.45) return 'sunny';
  if (random < 0.7) return 'cloudy';
  if (random < 0.92) return 'rainy';
  return 'stormy';
};

const generateRandomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const generateMockWeatherData = (days: number = 7): WeatherData[] => {
  const result: WeatherData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dateStr = date.toISOString().split('T')[0];

    const month = date.getMonth();
    let baseTempMax: number;
    let baseTempMin: number;

    if (month >= 5 && month <= 7) {
      baseTempMax = 32;
      baseTempMin = 22;
    } else if (month >= 2 && month <= 4) {
      baseTempMax = 22;
      baseTempMin = 12;
    } else if (month >= 8 && month <= 10) {
      baseTempMax = 24;
      baseTempMin = 14;
    } else {
      baseTempMax = 8;
      baseTempMin = -2;
    }

    const weatherType = getWeightedWeatherType(Math.random());
    let rainfall = 0;

    if (weatherType === 'rainy') {
      rainfall = Number(generateRandomInRange(3, 30).toFixed(1));
    } else if (weatherType === 'stormy') {
      rainfall = Number(generateRandomInRange(25, 80).toFixed(1));
    } else if (weatherType === 'cloudy') {
      rainfall = Number(generateRandomInRange(0, 2).toFixed(1));
    }

    const tempVariation = generateRandomInRange(-3, 3);
    const temperatureMax = Number((baseTempMax + tempVariation).toFixed(0));
    const temperatureMin = Number((baseTempMin + tempVariation - generateRandomInRange(2, 6)).toFixed(0));

    result.push({
      date: dateStr,
      temperatureMax,
      temperatureMin,
      rainfall,
      weatherType,
    });
  }

  return result;
};

export const correlateOperationsWithWeather = (
  operations: Operation[],
  weather: WeatherData[],
  daysAfterRain: number = 3
): WeatherOperationCorrelation[] => {
  const rainyDays = weather.filter((w) => w.rainfall > 1);

  const result: WeatherOperationCorrelation[] = [];

  for (const rainWeather of rainyDays) {
    const rainDate = new Date(rainWeather.date);
    rainDate.setHours(0, 0, 0, 0);

    const relatedOperations: Operation[] = [];

    for (const op of operations) {
      const opDate = new Date(op.date);
      opDate.setHours(0, 0, 0, 0);

      const daysGap = differenceInDays(opDate, rainDate);
      if (daysGap >= 0 && daysGap <= daysAfterRain) {
        relatedOperations.push(op);
      }
    }

    if (relatedOperations.length > 0) {
      relatedOperations.sort((a, b) => {
        const gapA = differenceInDays(new Date(a.date), rainDate);
        const gapB = differenceInDays(new Date(b.date), rainDate);
        return gapA - gapB;
      });

      const lastOp = relatedOperations[relatedOperations.length - 1];
      const daysGap = differenceInDays(new Date(lastOp.date), rainDate);

      result.push({
        weather: rainWeather,
        operations: relatedOperations,
        daysGap,
      });
    }
  }

  result.sort((a, b) => {
    return new Date(b.weather.date).getTime() - new Date(a.weather.date).getTime();
  });

  return result;
};
