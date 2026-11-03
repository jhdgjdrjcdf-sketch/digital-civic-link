
import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, CheckCircle2 } from "lucide-react";

type Props = {
  onCapture: (file: File) => void;
};

export default function LiveIdCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError("");

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setError(
        "تعذر تشغيل الكاميرا. تحقق من الأذونات واستخدم اتصالاً آمناً HTTPS."
      );
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || !cameraReady) return;

    const canvas = document.createElement("canvas");

    const maxWidth = 2200;
    const scale = Math.min(1, maxWidth / video.videoWidth);

    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      setError("تعذر معالجة الصورة.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(blob => {
      if (!blob) {
        setError("تعذر التقاط الصورة.");
        return;
      }

      const file = new File(
        [blob],
        `identity-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      const preview = URL.createObjectURL(blob);

      setCaptured(old => {
        if (old) URL.revokeObjectURL(old);
        return preview;
      });

      onCapture(file);
      stopCamera();
    }, "image/jpeg", 0.94);
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5" />
        <h3 className="font-semibold">
          تصوير البطاقة الوطنية
        </h3>
      </div>

      <p className="text-sm text-muted-foreground">
        ضع البطاقة داخل الإطار وتأكد من وضوح النصوص
        والبيانات قبل الالتقاط.
      </p>

      {captured ? (
        <div className="space-y-3">
          <img
            src={captured}
            alt="معاينة صورة البطاقة"
            className="w-full rounded-xl border"
          />

          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 size={18} />
            <span>تم التقاط الصورة</span>
          </div>

          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(captured);
              setCaptured(null);
              onCapture(null as unknown as File);
              startCamera();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border p-3"
          >
            <RefreshCw size={17} />
            إعادة التصوير
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />

            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Camera size={35} />
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          {!cameraReady ? (
            <button
              type="button"
              onClick={startCamera}
              className="w-full rounded-xl bg-primary p-3 text-primary-foreground"
            >
              تشغيل الكاميرا
            </button>
          ) : (
            <button
              type="button"
              onClick={capturePhoto}
              className="w-full rounded-xl bg-primary p-3 text-primary-foreground"
            >
              التقاط الصورة
            </button>
          )}
        </div>
      )}
    </div>
  );
}
