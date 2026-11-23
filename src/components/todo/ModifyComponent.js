import useCustomLogin from "../../hooks/useCustomLogin";
import { useCallback, useEffect, useState } from "react";
import { deleteOne, getOne, putOne } from "../../api/todoApi";

import ResultModal from "../common/ResultModal";
import useCustomMove from "../../hooks/useCustomMove";

const initState = {
  tno:0,
  title:'',
  writer: '',
  dueDate: '',
  complete: false
}

const ModifyComponent = ({tno, moveList, moveRead}) => {
  const {exceptionHandle} = useCustomLogin()

  const [todo, setTodo] = useState({...initState})
  const [error, setError] = useState('')

  const [result, setResult] = useState(null)

  const {moveToList, moveToRead} = useCustomMove()

  const handleClickModify = () => {

    setError('')
    putOne(todo).then(data => {
      console.log("modify result: " + data)
      setResult('Modified')
    }).catch((ex) => { exceptionHandle(ex); setError('수정하지 못했습니다. 입력 내용을 확인해 주세요.') })
  }

  const handleClickDelete = () => {

    setError('')
    deleteOne(tno).then( data => {
      console.log("delete result: " + data)
      setResult('Deleted')
    }).catch((ex) => { exceptionHandle(ex); setError('삭제하지 못했습니다. 다시 시도해 주세요.') })

  }

  const closeModal = () => {
    if(result ==='Deleted') {
      moveToList()
    }else {
      moveToRead(tno)
    }
  }

  useEffect(() => {

    getOne(tno).then(data => setTodo(data)).catch((ex) => { exceptionHandle(ex); setError('조회하지 못했습니다. 번호를 확인해 주세요.') })

  },[tno, exceptionHandle])

  const handleChangeTodo = (e) => {

    todo[e.target.name] = e.target.value

    setTodo({...todo})
  }

  const handleChangeTodoComplete = (e) => {

    const value = e.target.value

    todo.complete = (value === 'Y')

    setTodo({...todo})
  }

  return (
    <div className = "border-2 border-sky-200 mt-10 m-2 p-4">
    {error && <p role="alert">{error}</p>}

{result ? <ResultModal title={'처리결과'} content={result} callbackFn={closeModal}></ResultModal>  :<></>}

      <div className="flex justify-center mt-10">
        <div className="relative mb-4 flex w-full flex-wrap items-stretch">
          <div className="w-1/5 p-6 text-right font-bold">TNO</div>
          <div className="w-4/5 p-6 rounded-r border border-solid shadow-md bg-gray-100">
            {todo.tno}
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="relative mb-4 flex w-full flex-wrap items-stretch">
          <div className="w-1/5 p-6 text-right font-bold">WRITER</div>
          <div className="w-4/5 p-6 rounded-r border border-solid shadow-md bg-gray-100">
            {todo.writer}
          </div>

        </div>
      </div>
      <div className="flex justify-center">
        <div className="relative mb-4 flex w-full flex-wrap items-stretch">
          <div className="w-1/5 p-6 text-right font-bold">TITLE</div>
          <input className="w-4/5 p-6 rounded-r border border-solid border-neutral-300 shadow-md"
           name="title"
           type={'text'}
           value={todo.title}
           onChange={handleChangeTodo}
           >
           </input>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="relative mb-4 flex w-full flex-wrap items-stretch">
          <div className="w-1/5 p-6 text-right font-bold">DUEDATE</div>
          <input className="w-4/5 p-6 rounded-r border border-solid border-neutral-300 shadow-md"
           name="dueDate"
           type={'date'}
           value={todo.dueDate}
           onChange={handleChangeTodo}
           >
           </input>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="relative mb-4 flex w-full flex-wrap items-stretch">
          <div className="w-1/5 p-6 text-right font-bold">COMPLETE</div>
          <select
            name="status"
            className="border-solid border-2 rounded m-1 p-2"
            onChange={handleChangeTodoComplete}
            value = {todo.complete? 'Y':'N'} >
            <option value='Y'>Completed</option>
            <option value='N'>Not Yet</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end p-4">
        <button type="button"
          className="inline-block rounded p-4 m-2 text-xl w-32  text-white bg-red-500"
          onClick={handleClickDelete}
        >
          Delete
        </button>
        <button type="button"
          className="rounded p-4 m-2 text-xl w-32 text-white bg-blue-500"
          onClick={handleClickModify}
        >
          Modify
        </button>

      </div>
    </div>
   );
}

export default ModifyComponent;
