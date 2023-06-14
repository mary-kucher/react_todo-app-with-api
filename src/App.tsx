/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  MutableRefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { UserWarning } from './UserWarning';
import { TodoList } from './components/TodoList';
import { Todo } from './types/Todo';
import { Header } from './components/Header';
import {
  addTodo, getTodos, removeTodo, updateTodo,
} from './api/todos';
import { Footer } from './components/Footer';
import { FilterValues } from './types/FilterValues';
import { ErrorValues } from './types/ErrorValues';
import { Notification } from './components/Notification';
import { ErrorContext } from './context/ErrorContextProvider';

const USER_ID = 10544;

export const App: React.FC = () => {
  const [todosFromServer, setTodosFromServer] = useState<Todo[]>([]);
  const [filterValue, setFilterValue] = useState(FilterValues.All);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [completedTodosID, setCompletedTodosID] = useState<number[]>([]);
  const [todosForTemp, setTodosForTemp] = useState<number[]>([]);
  const errorContext = useContext(ErrorContext);
  const inputHeaderRef = useRef() as MutableRefObject<HTMLInputElement>;
  const leftTodosCount
    = todosFromServer?.filter(todo => !todo.completed).length || 0;

  const filteredTodos = (todos: Todo[], value: FilterValues) => {
    return todos.filter(todo => {
      switch (value as FilterValues) {
        case FilterValues.Completed:
          return todo.completed;
        case FilterValues.Active:
          return !todo.completed;
        case FilterValues.All:
        default:
          return true;
      }
    });
  };

  const getId = (todos: Todo[]) => {
    return todos.map(todo => todo.id);
  };

  useEffect(() => {
    getTodos(USER_ID)
      .then(res => {
        setTodosFromServer(res);
      })
      .catch(() => {
        errorContext.setErrorMessage(ErrorValues.Loading);
      });
  }, []);

  useEffect(() => {
    setCompletedTodosID(() => getId(filteredTodos(todosFromServer,
      FilterValues.Completed)));
  }, [todosFromServer, leftTodosCount]);

  const todosAfterFilter = useMemo(() => {
    return filteredTodos(todosFromServer, filterValue);
  }, [todosFromServer, filterValue]);

  const handleAddingTodos = (inputValue: string) => {
    const newTodo = {
      userId: USER_ID,
      title: inputValue,
      completed: false,
    };

    setTempTodo({
      id: 0,
      ...newTodo,
    });

    addTodo(USER_ID, newTodo)
      .then(res => setTodosFromServer(prevTodos => [...prevTodos, res]))
      .catch(() => errorContext.setErrorMessage(ErrorValues.Adding))
      .finally(() => {
        inputHeaderRef.current.disabled = false;
        inputHeaderRef.current.focus();
        setTempTodo(null);
      });
  };

  const handleUpdatingTodo = (id: number, data: null | string) => {
    const todoForUpdating = todosFromServer.find(t => t.id === id);
    let dataForUpdating = {};

    if (todoForUpdating && data === null) {
      dataForUpdating = todoForUpdating.completed
        ? { completed: false }
        : { completed: true };
    } else if (todoForUpdating && typeof data === 'string') {
      if (data.length) {
        dataForUpdating = { title: data };
      } else {
        return;
      }
    }

    setTempTodo({
      id,
      userId: 0,
      title: '',
      completed: false,
    });

    updateTodo(USER_ID, id, dataForUpdating)
      .then(res => {
        if (todoForUpdating) {
          todoForUpdating.completed = res.completed;
        }

        setTodosFromServer(prevState => {
          return prevState.map(todo => {
            return todo.id === id
              ? { ...todo, ...res }
              : todo;
          });
        });
      })
      .catch(() => errorContext.setErrorMessage(ErrorValues.Updating))
      .finally(() => {
        setTempTodo(null);
        setTodosForTemp([]);
      });
  };

  const handleToggleAll = (leftTodos: number) => {
    const IDs = leftTodos > 0
      ? getId(filteredTodos(todosFromServer, FilterValues.Active))
      : getId(filteredTodos(todosFromServer, FilterValues.Completed));

    IDs.forEach(id => handleUpdatingTodo(id, null));

    setTodosForTemp(IDs);
  };

  const handleDeletingTodo = (id: number) => {
    setTempTodo({
      id,
      userId: 0,
      title: '',
      completed: false,
    });
    removeTodo(USER_ID, id)
      .then(() => setTodosFromServer(prevTodos => prevTodos
        .filter(todo => todo.id !== id)))
      .catch(() => errorContext.setErrorMessage(ErrorValues.Deleting))
      .finally(() => {
        setTempTodo(null);
      });
  };

  const handleDeletingCompletedTodos = (idsForDeleting: number[]) => {
    setTodosForTemp([...idsForDeleting]);
    idsForDeleting.forEach(id => handleDeletingTodo(id));
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          leftTodosCount={leftTodosCount}
          handleAddingTodos={handleAddingTodos}
          inputHeaderRef={inputHeaderRef}
          handleToggleAll={handleToggleAll}
        />
        {todosAfterFilter && (
          <>
            <TodoList
              todosAfterFilter={todosAfterFilter}
              handleDeletingTodo={handleDeletingTodo}
              tempTodo={tempTodo}
              todosForTemp={todosForTemp}
              handleUpdatingTodo={handleUpdatingTodo}
            />

            <Footer
              leftTodosCount={leftTodosCount}
              setFilterValue={setFilterValue}
              handleDeletingCompletedTodos={handleDeletingCompletedTodos}
              completedTodosID={completedTodosID}
            />
          </>
        )}
      </div>
      <Notification />
    </div>
  );
};
