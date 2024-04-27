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
      // Fetch climate data from Open-Meteo API
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=1993-01-01&end_date=2022-12-31&daily=temperature_2m_mean,precipitation_sum,windspeed_10m_max&timezone=auto`;
      const weather_response = await axios.get(url);
      const climateData = weather_response.data;

      // Extract relevant climate information
      const avgTemperature =
        climateData.daily.temperature_2m_mean.reduce(
          (sum: number, temp: number) => sum + temp,
          0
        ) / climateData.daily.temperature_2m_mean.length;
      const avgPrecipitation =
        climateData.daily.precipitation_sum.reduce(
          (sum: number, precip: number) => sum + precip,
          0
        ) / climateData.daily.precipitation_sum.length;
      const yearlyPrecipitation = avgPrecipitation * 365;
      const avgWindSpeed =
        climateData.daily.windspeed_10m_max.reduce(
          (sum: number, speed: number) => sum + speed,
          0
        ) / climateData.daily.windspeed_10m_max.length;

      const prompt = `Given the coordinates latitude: ${latitude} and longitude: ${longitude}, the average temperature over the last 30 years is ${avgTemperature.toFixed(
        2
      )}°C, the average precipitation is ${yearlyPrecipitation.toFixed(
        2
      )}mm per year, and the average maximum wind speed is ${avgWindSpeed.toFixed(
        2
      )}m/s. Provide smart energy recommendations based on this climate data.`;

      console.log(prompt);

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "I am programmed to provide tailored recommendations for renewable energy solutions and energy efficiency strategies suited to specific coordinates. Focus on solar, wind, and other renewable energy estimations, excluding any unrelated content.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 150,
      });

      // Send back the AI's response text
      res.status(200).json({ response: response.choices[0].message.content });
    } catch (error) {
      console.error("Failed to fetch response from OpenAI:", error);
      res.status(500).json({ error: "Failed to fetch response from OpenAI" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
