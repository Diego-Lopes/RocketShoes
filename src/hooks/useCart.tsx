import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart"); //pegando valore salvos no localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart); // como vem string temos que converter em json.parse para transformar em array.
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  //isso faz atualização no valor caso as variaveis for mudadas.
  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      //adicionar um produto ao carrinho.
      const updatedCart = [...cart]; //criando novo array com o array cart, assim não mudamos o array de cart
      //verificar se o produto existe.
      const productExists = updatedCart.find(
        (product) => product.id === productId
      ); //fazendo um busca com id recebido do parâmentro da função.

      //chamando e criando uma variável de estoque para validar com estoque.
      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount; //pegando o valor de data.amount.
      //validando o produto no carrinho.
      const currentAmount = productExists ? productExists.amount : 0;
      //quantidade desejada.
      const amount = currentAmount + 1; //atual mais um.

      //verificando os valores.
      //verificando o estoque com a quantia desejada do cliente.
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return; // retornar desse ponto.
      }

      //verificar se o produto exite de fato
      if (productExists) {
        productExists.amount = amount; //atualizar a quantidade do produto no carrinho. como fizemos um novo array, pegando as referência do array cart,
        //conseguimos atualizar o array de productExists sem alterar o cart assim respeitamos a regra de imutabilidade do react.
      } else {
        //se for produto novo pegar da api get.
        const product = await api.get(`/products/${productId}`);

        //adicionando o produto pela primeira vez colocamos valor 1.
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        //perpetuando
        updatedCart.push(newProduct);
      }
      //para perpetuar as alteração do update cart.
      setCart(updatedCart);
      //atualizar localStore. Mais temos que converter para string.
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //para remover temos que verificar se está no carrinho certo?
      const updatedCart = [...cart]; //aqui usamos assim para mantar a imutabilidade.
      //usando o index podemos usar splice para remover do array.
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );
      //agora a condição para validar o argumento.
      if (productIndex >= 0) {
        //O SPLICE pode remover um elemento do array, se nescessario  adicionar também.
        //mais vamos remover, splice o primeiro parametro é onde vamos começar a remover/adicionar e o outro
        // é quantos quer remover.
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        //aqui forçamos o erro para cair no catch.
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //verificando para sair imediatamente.
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      //agora validade se existe o produto.
      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        //forçamos o erro para cair no catch.
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
