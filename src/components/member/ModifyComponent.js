import { useEffect } from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { modifyMember } from "../../api/memberApi";
import useCustomLogin from "../../hooks/useCustomLogin";
import ResultModal from "../common/ResultModal";

const initState = { email: "", pw: "", nickname: "" };

const ModifyComponent = () => {
  const [member, setMember] = useState(initState);
  const loginInfo = useSelector(state => state.loginSlice);
  const { doLogout, moveToLogin, exceptionHandle } = useCustomLogin();
  const [result, setResult] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setMember({ email: loginInfo.email, pw: "", nickname: loginInfo.nickname || "" });
  }, [loginInfo.email, loginInfo.nickname]);
  const handleChange = (event) => setMember({ ...member, [event.target.name]: event.target.value });
  const handleClickModify = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await modifyMember(member);
      setResult(true);
    } catch (error) {
      if (!exceptionHandle(error)) setError("회원정보 수정에 실패했습니다. 입력 내용을 확인해주세요.");
    } finally {
      setPending(false);
    }
  };
  const closeModal = () => {
    doLogout();
    moveToLogin();
  };
  return <div className="mt-6">
    {result && <ResultModal title="회원정보" content="정보수정완료" callbackFn={closeModal} />}
    <form onSubmit={handleClickModify}>
      <div className="flex justify-center"><div className="relative mb-4 flex w-full flex-wrap items-stretch">
        <label htmlFor="member-email" className="w-1/5 p-6 text-right font-bold">Email</label>
        <input id="member-email" name="email" value={member.email} readOnly className="w-4/5 p-6 rounded-r border border-solid border-neutral-300 shadow-md" />
      </div></div>
      <div className="flex justify-center"><div className="relative mb-4 flex w-full flex-wrap items-stretch">
        <label htmlFor="member-pw" className="w-1/5 p-6 text-right font-bold">Password</label>
        <input id="member-pw" name="pw" type="password" autoComplete="new-password" required minLength={4} maxLength={72} value={member.pw} onChange={handleChange} className="w-4/5 p-6 rounded-r border border-solid border-neutral-300 shadow-md" />
      </div></div>
      <div className="flex justify-center"><div className="relative mb-4 flex w-full flex-wrap items-stretch">
        <label htmlFor="member-nickname" className="w-1/5 p-6 text-right font-bold">Nickname</label>
        <input id="member-nickname" name="nickname" required maxLength={100} value={member.nickname} onChange={handleChange} className="w-4/5 p-6 rounded-r border border-solid border-neutral-300 shadow-md" />
      </div></div>
      {error && <div role="alert" className="text-red-600">{error}</div>}
      <div className="flex justify-end"><button type="submit" disabled={pending} className="rounded p-4 m-2 text-xl w-32 text-white bg-blue-500">Modify</button></div>
    </form>
  </div>;
};

export default ModifyComponent;
