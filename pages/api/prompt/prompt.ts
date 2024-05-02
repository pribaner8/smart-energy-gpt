import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import axios from "axios";

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "function" | "data" | "tool" | "AI";
  content: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// validate latitude and longitude
const isValidCoordinates = (lat: number, lon: number): boolean => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

// Function to fetch location data from Maps.co Geocoding API
const fetchLocation = async (latitude: number, longitude: number) => {
  const url = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=${process.env.MAPS_API_KEY}`;
  const response = await axios.get(url);

  if (!response.data.address) {
    return { error: "Unable to geocode" };
  }

  const locationData = response.data.address;
  const formattedLocation = `${
    locationData.village || locationData.town || locationData.city || ""
  }, ${locationData.state || ""}, ${locationData.country || ""}`;
  return formattedLocation;
};
// Function to fetch climate data
const fetchClimateData = async (latitude: number, longitude: number) => {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=1993-01-01&end_date=2022-12-31&daily=temperature_2m_mean,precipitation_sum,windspeed_10m_max&timezone=auto`;
  const response = await axios.get(url);
  const { daily } = response.data;

  const avgTemperature =
    daily.temperature_2m_mean.reduce(
      (sum: number, value: number) => sum + value,
      0
    ) / daily.temperature_2m_mean.length;
  const totalPrecipitation = daily.precipitation_sum.reduce(
    (sum: number, value: number) => sum + value,
    0
  );
  const avgWindSpeed =
    daily.windspeed_10m_max.reduce(
      (sum: number, value: number) => sum + value,
      0
    ) / daily.windspeed_10m_max.length;

  return {
    avgTemperature: avgTemperature.toFixed(2),
    totalPrecipitation: totalPrecipitation.toFixed(2),
    avgWindSpeed: avgWindSpeed.toFixed(2),
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { latitude, longitude } = req.body;

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    try {
      const location = await fetchLocation(latitude, longitude);
      const { avgTemperature, totalPrecipitation, avgWindSpeed } =
        await fetchClimateData(latitude, longitude);

        const prompt = `With an average temperature of ${avgTemperature}°C, and average peak  wind speed of ${avgWindSpeed}m/s in ${location}, provide a forecast for potential solar and wind energy generation. Assess the viability of these energy sources considering the climate data, geographical features, and local energy demand. Include estimated energy outputs and discuss any seasonal variations that might affect production.`;
        console.log(prompt);

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-2024-04-09",
        messages: [
          {
            role: "system",
            content: "Provide a detailed analysis of solar and wind energy potential, including climate and geographic considerations, estimated energy outputs, and seasonal variations. Use clear headings, bullet points, and numerical examples to structure your response."
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });
      const modifiedContent = response.choices[0].message.content?.replace(/\\times/g, '*');

      res.status(200).json({ response: modifiedContent });

    } catch (error) {
      console.error("Error in processing the request:", error);
      res.status(500).json({ error: "Failed to process the request" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
