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
  // const location = response.data.address; // Adjust based on the actual response structure
  // console.log(response);
  const locationData = response.data.address; // Adjust based on the actual response structure
  const formattedLocation = `${locationData.city || ''}, ${locationData.country}`;
  return formattedLocation;
};
// Function to fetch climate data
const fetchClimateData = async (latitude: number, longitude: number) => {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=1993-01-01&end_date=2022-12-31&daily=temperature_2m_mean,precipitation_sum,windspeed_10m_max&timezone=auto`;
  const response = await axios.get(url);
  const { daily } = response.data;
  
  const avgTemperature = daily.temperature_2m_mean.reduce((sum, value) => sum + value, 0) / daily.temperature_2m_mean.length;
  const totalPrecipitation = daily.precipitation_sum.reduce((sum, value) => sum + value, 0);
  const avgWindSpeed = daily.windspeed_10m_max.reduce((sum, value) => sum + value, 0) / daily.windspeed_10m_max.length;

  return {
    avgTemperature: avgTemperature.toFixed(2),
    totalPrecipitation: totalPrecipitation.toFixed(2),
    avgWindSpeed: avgWindSpeed.toFixed(2)
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
      const { avgTemperature, totalPrecipitation, avgWindSpeed } = await fetchClimateData(latitude, longitude);

      const prompt = `Location: ${location}. The average temperature over the last 30 years is ${avgTemperature}°C, the total annual precipitation is ${totalPrecipitation}mm, and the average maximum wind speed is ${avgWindSpeed}m/s. Based on this climate data, provide smart energy recommendations tailored to this region.`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "I am programmed to provide tailored recommendations for renewable energy solutions and energy efficiency strategies suited to specific geographical and climatic conditions. Focus on solar, wind, and other renewable energy estimations, considering local factors and excluding any unrelated content.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      res.status(200).json({ response: response.choices[0].message.content });
    } catch (error) {
      console.error("Error in processing the request:", error);
      res.status(500).json({ error: "Failed to process the request" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
