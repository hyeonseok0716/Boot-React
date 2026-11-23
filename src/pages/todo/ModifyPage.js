import { useNavigate, useParams } from "react-router-dom";

const ModifyPage = () => {
  const { tno } = useParams();
  const navigate = useNavigate();

  const moveToRead = () => {
    navigate({ pathname: `/todo/read/${tno}` });
  };

  const moveToList = () => {
    navigate({ pathname: "/todo/list" });
  };

  return (
    <div className="text-3xl font-extrabold">
      Todo Modify Page
      <div>
        <button onClick={moveToRead}>Test Read</button>
        <button onClick={moveToList}>Test List</button>
      </div>
    </div>
  );
};

export default ModifyPage;
