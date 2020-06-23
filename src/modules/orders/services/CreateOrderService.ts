import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    // products [{ id, quantity }] - Solicitação do Cliente
    // findProducts [{ id, name, price, quantity }] - Estoque da Empresa

    const relatedProducts = await this.productsRepository.findAllById(products);

    const productList = products.map(product => {
      const relatedProduct = relatedProducts.find(
        _product => _product.id === product.id,
      );

      if (!relatedProduct) {
        throw new AppError('Some products were not found');
      }

      if (product.quantity > relatedProduct.quantity) {
        throw new AppError('Product is out of stock');
      }

      return {
        product_id: relatedProduct.id,
        price: relatedProduct.price,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productList,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
