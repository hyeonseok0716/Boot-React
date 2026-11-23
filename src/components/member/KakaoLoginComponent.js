import { useState } from "react";
import { getKakaoLoginLink } from "../../api/kakaoApi";

const KakaoLoginComponent = () => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const handleClick = async () => {
    setPending(true);
    setError("");
    try {
      window.location.assign(await getKakaoLoginLink());
    } catch (error) {
      setError("카카오 로그인 설정 또는 서버 연결을 확인해주세요.");
      setPending(false);
    }
  };
  return <div className="flex flex-col items-center p-4">
    <button type="button" onClick={handleClick} disabled={pending}
      className="rounded p-4 w-full bg-yellow-300 text-xl font-bold">KAKAO LOGIN</button>
    {error && <div role="alert" className="mt-4 text-red-600">{error}</div>}
  </div>;
};

export default KakaoLoginComponent;
