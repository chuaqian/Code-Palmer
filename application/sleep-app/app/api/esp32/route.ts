import { NextRequest, NextResponse } from 'next/server';

interface ESP32Command {
  command: string;
  data?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: ESP32Command = await request.json();
    const { command, data } = body;

    // For now, we'll return a mock response since we can't directly access serial ports
    // In a real implementation, you would use a Node.js serial library
    console.log(`ESP32 Command: ${command}`, data);

    // Simulate different commands
    switch (command) {
      case 'BUZZER_TEST':
        console.log('🔊 Testing buzzer tones');
        break;
      case 'PRESET_TONE':
        console.log(`🎵 Playing preset tone ${data?.toneId}`);
        break;
      case 'SET_VOLUME':
        console.log(`🔊 Setting volume to ${data?.volume}%`);
        break;
      case 'TRIGGER_SUNRISE':
        console.log('🌅 Triggering sunrise simulation');
        break;
      case 'FAST_SUNRISE':
        console.log('⚡ Fast sunrise demo');
        break;
      case 'TRIGGER_SUNSET':
        console.log('🌇 Triggering sunset simulation');
        break;
      case 'RED_AMBIENT':
        console.log('🔴 Setting red ambient light');
        break;
      case 'BLUE_CALM':
        console.log('🔵 Setting blue calm light');
        break;
      case 'RAINBOW':
        console.log('🌈 Starting rainbow light show');
        break;
      case 'NIGHT_LIGHT':
        console.log('🌙 Setting night light');
        break;
      case 'TRIGGER_ALARM':
        console.log('🚨 Triggering full alarm sequence');
        break;
      case 'STOP_ALARM':
        console.log('🛑 Stopping all alarms and effects');
        break;
      default:
        console.log(`❓ Unknown command: ${command}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Command '${command}' sent to ESP32`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ESP32 API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send command to ESP32' },
      { status: 500 }
    );
  }
}