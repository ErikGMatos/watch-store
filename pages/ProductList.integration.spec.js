import { mount } from '@vue/test-utils';
import Search from '@/components/Search';
import ProductCard from '@/components/ProductCard';
import axios from 'axios';
import Vue from 'vue';
import { makeServer } from '@/miragejs/server';
import ProductList from '.';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

describe('ProductList - integration', () => {
  let server;

  beforeEach(() => {
    server = makeServer({ environment: 'test' });
  });

  afterEach(() => {
    server.shutdown();
    jest.clearAllMocks();
  });

  const getProducts = (quantity = 10, overrides = []) => {
    let overrrideList = [];

    if (overrides.length > 0) {
      overrrideList = overrides.map((override) =>
        server.create('product', override)
      );
    }
    const products = [
      ...server.createList('product', quantity),
      ...overrrideList,
    ];
    return products;
  };

  const mountProducList = async (
    quantity = 10,
    overrides = [],
    shouldReject = false
  ) => {
    const products = getProducts(quantity, overrides);

    if (shouldReject) {
      axios.get.mockReturnValue(Promise.reject(new Error('')));
    } else {
      axios.get.mockReturnValue(
        Promise.resolve({
          data: { products },
        })
      );
    }

    const wrapper = mount(ProductList, {
      mocks: {
        $axios: axios,
      },
    });

    await Vue.nextTick();

    return { wrapper, products };
  };
  it('should mount the component', async () => {
    const { wrapper } = await mountProducList();

    expect(wrapper.vm).toBeDefined();
  });

  it('should mount the Search component', async () => {
    const { wrapper } = await mountProducList();

    expect(wrapper.findComponent(Search)).toBeDefined();
  });

  it('should call axios.get on component mount', async () => {
    await mountProducList();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('/api/products');
  });

  it('should mount the ProductCard component 10 times', async () => {
    const { wrapper } = await mountProducList();
    const cards = wrapper.findAllComponents(ProductCard);

    expect(cards).toHaveLength(10);
  });

  it('should  display the error mesage when  Promise rejects', async () => {
    const { wrapper } = await mountProducList(10, undefined, true);

    expect(wrapper.text()).toContain('Problemas ao carregar a lista!');
  });

  it('should filter the product list when a search is performed', async () => {
    const { wrapper } = await mountProducList(10, [
      { title: 'meu relógio amado' },
      { title: 'meu outro relógio estimado' },
    ]);

    const search = wrapper.findComponent(Search);
    search.find('input[type=search]').setValue('relógio');
    await search.find('form').trigger('submit');

    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('relógio');
    expect(cards).toHaveLength(2);
  });

  it('should filter the product list when a search is performed and restore list when cleared', async () => {
    const { wrapper } = await mountProducList(10, [
      { title: 'meu relógio amado' },
    ]);

    const search = wrapper.findComponent(Search);
    search.find('input[type=search]').setValue('relógio');
    await search.find('form').trigger('submit');
    search.find('input[type=search]').setValue('');
    await search.find('form').trigger('submit');

    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('');
    expect(cards).toHaveLength(11);
  });
});
