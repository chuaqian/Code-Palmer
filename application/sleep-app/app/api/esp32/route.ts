import { NextRequest, NextResponse } from 'next/server';

interface ESP32Command {
  command: string;
  data?: any;
}

const BACKEND_SERVER_URL = 'http://127.0.0.1:3001';

export async function POST(request: NextRequest) {
  try {
    const body: ESP32Command = await request.json();
    const { command, data } = body;

    console.log(`Sending ESP32 Command: ${command}`, data);

    // Send command to local agent
    const response = await fetch(`${BACKEND_SERVER_URL}/command`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command, data }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
    console.log(`✅ Command '${command}' successfully sent to ESP32`);
    return NextResponse.json({ 
        success: true, 
        message: `Command '${command}' sent to ESP32`,
        timestamp: new Date().toISOString(),
        agentResponse: result
    });
    } else {
    console.error(`❌ Failed to send command '${command}':`, result.error);
    return NextResponse.json(
        { 
        success: false, 
        error: result.error || 'Local agent failed to process command',
        command 
        },
        { status: 500 }
        );
    }
    } catch (error) {
        console.error('ESP32 API Error:', error);
        return NextResponse.json(
        { success: false, error: 'Failed to process ESP32 command' },
        { status: 500 }
        );
    }
}