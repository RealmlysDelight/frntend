import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "/components/ui/card"
import { Button } from "/components/ui/button"
import { Loader2 } from "lucide-react"

const emotions = [
  { name: 'Happy', emoji: '😊', color: 'bg-yellow-100' },
  { name: 'Sad', emoji: '😢', color: 'bg-blue-100' },
  { name: 'Angry', emoji: '😠', color: 'bg-red-100' },
  { name: 'Surprised', emoji: '😲', color: 'bg-purple-100' },
  { name: 'Fearful', emoji: '😨', color: 'bg-indigo-100' },
  { name: 'Disgusted', emoji: '🤢', color: 'bg-green-100' },
  { name: 'Neutral', emoji: '😐', color: 'bg-gray-100' },
]

export default function EmotionDetection() {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState(null)
  const [apiUrl, setApiUrl] = useState('https://your-colab-ngrok-url.ngrok.io/detect_emotion')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const processingIntervalRef = useRef(null)

  const captureAndProcessFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return

    setIsProcessing(true)

    try {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg')

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const detectedEmotion = data.results[0]
        const matchedEmotion = emotions.find(
          e => e.name.toLowerCase() === detectedEmotion.emotion.toLowerCase()
        )

        if (matchedEmotion) {
          setCurrentEmotion(matchedEmotion)

          const { bbox } = detectedEmotion
          context.strokeStyle = '#3b82f6'
          context.lineWidth = 2
          context.strokeRect(bbox[0], bbox[1], bbox[2], bbox[3])

          context.fillStyle = 'rgba(59, 130, 246, 0.7)'
          context.fillRect(bbox[0], bbox[1] - 30, 150, 30)
          context.fillStyle = 'white'
          context.font = '16px Arial'
          context.fillText(
            `${detectedEmotion.emoji} ${detectedEmotion.emotion}`,
            bbox[0] + 5,
            bbox[1] - 10
          )
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error)
      alert("Error processing frame. Make sure the API URL is correct and the backend is running.")
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
        processingIntervalRef.current = null
      }

      setIsCameraOn(false)
      setCurrentEmotion(null)
    } else {
      if (!apiUrl.startsWith('http')) {
        alert('Please enter a valid API URL')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()

          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth
            canvasRef.current.height = videoRef.current.videoHeight
          }

          setIsCameraOn(true)
          processingIntervalRef.current = setInterval(captureAndProcessFrame, 1000)
        }
      } catch (error) {
        console.error('Error accessing camera:', error)
        alert("Failed to access camera. Please grant permissions or check your device.")
      }
    }
  }

  const handleApiUrlChange = (e) => {
    setApiUrl(e.target.value)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
      }
    }
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Emotion Detection</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <div className="aspect-video w-full bg-gray-200 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
            />
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button
            onClick={toggleCamera}
            className="w-48"
            disabled={isProcessing}
          >
            {isCameraOn ? 'Stop Detection' : 'Start Detection'}
          </Button>

          {isProcessing && (
            <div className="flex items-center text-blue-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-1">
            API URL (from Google Colab)
          </label>
          <input
            type="text"
            id="apiUrl"
            value={apiUrl}
            onChange={handleApiUrlChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter the ngrok URL from Google Colab"
          />
        </div>

        {currentEmotion && (
          <div className={`p-4 rounded-lg ${currentEmotion.color} transition-all duration-300`}>
            <div className="flex items-center justify-center space-x-4">
              <span className="text-4xl">{currentEmotion.emoji}</span>
              <span className="text-xl font-semibold">{currentEmotion.name}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {emotions.map((emotion) => (
            <div
              key={emotion.name}
              className={`p-2 rounded-lg text-center ${emotion.color}`}
            >
              <div className="text-2xl">{emotion.emoji}</div>
              <div className="text-sm">{emotion.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

