import { useState } from "react";
import { v4 as uuid } from "uuid";

export function usePam() {
  const [messages, setMessages] = useState<any[]>([]);

  const send = async (userMessage: string) => {
    const id = uuid();

    const userMsg = { id, role: "user", content: userMessage };
 setMessages(prev => [...prev, {...userMsg, timestamp: new Date()}]);

    // 🔁 Fake response (replace later with OpenAI + MCP)
    const response = await fakePamResponse(userMessage);

    const assistantMsg = {
      id: uuid(),
      role: "assistant",
      content: response.text,
      render: response.render,
    };
 setMessages(prev => [...prev, {...assistantMsg, timestamp: new Date()}]);

    return assistantMsg;
  };

  return { messages, send };
}

// 🧪 Fake OpenAI -> Pam response
async function fakePamResponse(userMessage: string) {
  if (userMessage.includes("plan")) {
    return {
      text: "Here’s your scenic route with 2 park stops. I’ve updated the map.",
      render: { type: "map", data: { origin: { lat: -37.8, lng: 144.9 }, destination: { lat: -34.9, lng: 138.6 }, pois: [{ name: "Grampians NP", type: "park", lat: -37.233, lng: 142.502 }, { name: "Blue Lake", type: "scenic", lat: -37.83, lng: 140.78 }, ] } }
    };
  }

  return {
    text: "I'm here to help!",
    render: null
  };
}
interface ProjectFile {
  name: string;
  path: string;
}

interface ListProjectFilesResponse {
  result: string; // Assuming result is a JSON string of file paths
  status: string;
}

// Function to parse the JSON string result from the API response
function parseProjectFilesResult(resultJson: string): ProjectFile[] {
  try {
    const filePaths: string[] = JSON.parse(resultJson);;
    return filePaths.map(filePath => ({ name: filePath.split('/').pop() || '', path: filePath }));
  } catch (error) {
    console.error("Error parsing project files JSON:", error);
    return []; // Return an empty array or handle the error as needed
  }
}