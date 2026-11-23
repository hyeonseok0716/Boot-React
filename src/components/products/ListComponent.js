import { useQuery } from "@tanstack/react-query";
import useCustomLogin from "../../hooks/useCustomLogin";
import { useEffect, useState } from "react";
import { getList } from "../../api/productsApi";
import useCustomMove from "../../hooks/useCustomMove";
import FetchingModal from "../common/FetchingModal";

import { API_SERVER_HOST } from "../../api/todoApi";
import PageComponent from "../common/PageComponent";

const host = API_SERVER_HOST

const initState = {
  dtoList:[],
  pageNumList:[],
  pageRequestDTO: null,
  prev: false,
  next: false,
  totalCount: 0,
  prevPage: 0,
  nextPage: 0,
  totalPage: 0,
  current: 0
}

const ListComponent = () => {
  const {exceptionHandle, loginState} = useCustomLogin()

  const {page, size, refresh, moveToList, moveToRead} = useCustomMove()

  const query = useQuery(['products/list', loginState.email, {page, size, refresh}],
    () => getList({page, size}), {staleTime: 1000 * 5, onError: exceptionHandle})
  const serverData = query.data || initState
  const fetching = query.isFetching
  const error = query.isError ? '요청을 처리하지 못했습니다. 다시 시도해 주세요.' : ''

  return (
    <div className="border-2 border-blue-100 mt-10 mr-2 ml-2">

      {fetching? <FetchingModal/> :<></>}
    {error && <p role="alert">{error}</p>}

      <div className="flex flex-wrap mx-auto p-6">

        {serverData.dtoList.map(product =>

        <div
        key= {product.pno}
        className="w-1/2 p-1 rounded shadow-md border-2"
        role="link" tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter") moveToRead(product.pno) }}
        onClick={() => moveToRead(product.pno)}
        >

          <div className="flex flex-col  h-full">
            <div className="font-extrabold text-2xl p-2 w-full ">
              {product.pno}
            </div>
            <div className="text-1xl m-1 p-2 w-full flex flex-col">

              <div className="w-full overflow-hidden ">
                <img alt="product"
                className="m-auto rounded-md w-60"
                src={`${host}/api/products/view/${product.uploadFileNames[0] ? `s_${encodeURIComponent(product.uploadFileNames[0])}` : "default.jpeg"}`}/>
              </div>

              <div className="bottom-0 font-extrabold bg-white">
                <div className="text-center p-1">
                  이름: {product.pname}
                </div>
                <div className="text-center p-1">
                  가격: {product.price}
                </div>
              </div>

            </div>
          </div>
        </div>
        )}
      </div>

      <PageComponent serverData={serverData} movePage={moveToList}></PageComponent>

    </div>

    );

}

export default ListComponent;
