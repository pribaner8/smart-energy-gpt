'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const { messages, input, handleInputChange } = useChat();
  const [chatMessages, setChatMessages] = useState(messages);
  const [file, setFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [apiResponse, setApiResponse] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); 
  
    const latitudes = parseFloat(latitude);
    const longitudes = parseFloat(longitude);
  
    if (isNaN(latitudes) || isNaN(longitudes)) {
      alert('Please enter valid numeric values for latitude and longitude.');
      return;
    }
  
    // Add user message to chatMessages
    setChatMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), role: 'user', content: `Latitude: ${latitude}, Longitude: ${longitude}` }]);
  
    try {
      const response = await fetch('/api/prompt/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch energy recommendations');
      }
  
      const data = await response.json();
      setApiResponse(data.response);
      setChatMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error fetching energy recommendations:', error);
      alert('Error fetching energy recommendations. Please try again.');
    }
  };

  const handleFileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        alert('File uploaded successfully.');
      } else {
        alert('Failed to upload file.');
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full min-h-screen py-24 mx-auto bg-gray-100 text-black">
      <div className="overflow-y-auto h-96 mb-4 shadow-lg rounded-lg">
        {chatMessages.map(m => (
          <div key={m.id} className={`whitespace-pre-wrap p-4 rounded-lg m-2 ${m.role === 'user' ? 'text-left bg-blue-100' : 'text-right bg-green-100'}`}>
            <strong>{m.role === 'user' ? 'User: ' : m.role === 'assistant' ? 'Smart Energy Assistant: ' : 'Assistant: '}</strong>
            <ReactMarkdown className="text-gray-800">{m.content}</ReactMarkdown>
          </div>
        ))}
      </div>

      <form onSubmit={handleFileSubmit} className="mb-4 p-4 bg-white rounded-lg shadow">
        <label htmlFor="csvFile" className="block mb-2 text-sm font-bold text-gray-700">
          Upload CSV File:
        </label>
        <input 
          id="csvFile"
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="block w-full p-2 mb-2 border border-gray-300 rounded text-gray-700 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-700"
        />
      </form>

      <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg w-full rounded-t-lg">
        <label className="block mb-2 text-sm font-bold text-gray-700">
          Enter your coordinates:
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Latitude"
              className="w-1/2 p-2 mb-2 border border-gray-300 rounded text-gray-700"
              onChange={e => setLatitude(e.target.value)}
              value={latitude}
            />
            <input
              type="text"
              placeholder="Longitude"
              className="w-1/2 p-2 mb-2 border border-gray-300 rounded text-gray-700"
              onChange={e => setLongitude(e.target.value)}
              value={longitude}
            />
          </div>
        </label>
        <button type="submit" className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          Get Energy Recommendations
        </button>
      </form>
    </div>
  );
}
