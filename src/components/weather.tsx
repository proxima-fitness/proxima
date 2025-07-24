import { SunIcon } from "lucide-react";

type WeatherProps = {
    temperature: number;
    weather: string;
    location: string;
  };

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
