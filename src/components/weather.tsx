/**
 * @module weather
 * Simple current-weather block: location, condition, temperature in °C with sun icon.
 * Depends on: lucide-react.
 * Used by: dashboard or demo pages that show weather.
 */
import { SunIcon } from "lucide-react";

/** @property temperature - Current temperature in Celsius. */
/** @property weather - Condition label (e.g. "Sunny"). */
/** @property location - Display name for the location. */
type WeatherProps = {
    temperature: number;
    weather: string;
    location: string;
  };

/** Renders a compact weather card for the given location and data. */
  export const Weather = ({ temperature, weather, location }: WeatherProps) => {
    return (
      <div className={" bg-blue-200 px-4 py-2 rounded-lg mx-8 text-blue-900 flex flex-row items-center gap-4"}>
        <SunIcon className="w-4 h-4" />
        <div className="flex flex-col">
            <h2>Current Weather for {location}</h2>
            <p>Condition: {weather}</p>
            <p>Temperature: {temperature}°C</p>
        </div>
      </div>
    );
  };
