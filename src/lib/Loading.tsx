export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#030712]">
      <svg
        width="220"
        height="70"
        viewBox="0 0 300 100"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="china3dWaveWarm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8b10a" stopOpacity="0" />
            <stop offset="50%" stopColor="#e8b10a" stopOpacity="1" />
            <stop offset="100%" stopColor="#e8b10a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="china3dWaveWarm1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0" />
            <stop offset="50%" stopColor="#ea580c" stopOpacity="1" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,50 Q75,100 150,50 T300,50"
          fill="none"
          stroke="url(#china3dWaveWarm)"
          strokeWidth="2">
          <animate
            attributeName="d"
            values="M0,50 Q75,100 150,50 T300,50; M0,50 Q75,0 150,50 T300,50; M0,50 Q75,100 150,50 T300,50"
            dur="4s"
            begin="0s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M0,50 Q75,0 150,50 T300,50"
          fill="none"
          stroke="url(#china3dWaveWarm1)"
          strokeWidth="2">
          <animate
            attributeName="d"
            values="M0,50 Q75,0 150,50 T300,50; M0,50 Q75,100 150,50 T300,50; M0,50 Q75,0 150,50 T300,50"
            dur="4s"
            begin="0s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}
