const PageComponent = ({serverData, movePage}) => {

  return (
    <div className="m-6 flex justify-center">

    {serverData.prev ?
      <button type="button"
      className="m-2 p-2 w-16 text-center  font-bold text-blue-400 "
      onClick={() => movePage({page:serverData.prevPage} )}>
      Prev </button> : <></>}

      {serverData.pageNumList.map(pageNum =>
      <button type="button"
      key={pageNum}
      className={ `m-2 p-2 w-12  text-center rounded shadow-md text-white ${serverData.current === pageNum? 'bg-gray-500':'bg-blue-400'}`}
      onClick={() => movePage( {page:pageNum})}>
      {pageNum}
      </button>

      )}

      {serverData.next ?
      <button type="button"
      className="m-2 p-2 w-16 text-center font-bold text-blue-400"
      onClick={() => movePage( {page:serverData.nextPage})}>
      Next
      </button> : <></>}

    </div>

  );
}

export default PageComponent;
