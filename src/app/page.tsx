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
  return (
    <div className="flex flex-col w-full h-full min-h-screen mx-auto bg-slate-200 text-gray-900">
      <div className="flex justify-center items-center bg-gray-900 text-white py-4">
        <h1 className="text-3xl font-bold">Smart Energy</h1>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-200px)] mb-4 shadow-xl rounded-xl">
        {chatMessages.map(m => (
          <div key={m.id} className={`whitespace-pre-wrap p-4 rounded-xl m-2 ${m.role === 'user' ? 'bg-indigo-200' : 'bg-teal-200'}`}>
            <strong>{m.role === 'user' ? 'User: ' : m.role === 'assistant' ? 'Smart Energy Assistant: ' : 'Assistant: '}</strong>
            <ReactMarkdown className="text-gray-900">{m.content}</ReactMarkdown>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 bg-gray-50 p-4 shadow-xl w-full rounded-t-xl">
        <label className="block mb-2 text-sm font-bold text-gray-800">
          Enter your coordinates:
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Latitude"
              className="w-1/2 p-2 mb-2 border border-gray-400 rounded text-gray-800"
              onChange={e => setLatitude(e.target.value)}
              value={latitude}
            />
            <input
              type="text"
              placeholder="Longitude"
              className="w-1/2 p-2 mb-2 border border-gray-400 rounded text-gray-800"
              onChange={e => setLongitude(e.target.value)}
              value={longitude}
            />
          </div>
        </label>
        <button type="submit" className="w-full bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded">
          Get Energy Recommendations
        </button>
      </form>
    </div>
  );
}
