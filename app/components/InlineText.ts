import { defineComponent, h, onMounted, ref } from 'vue';
import type { VNodeChild } from 'vue';
import InlineLink from './InlineLink.vue';
import { parse_inline_links } from '~~/shared/inline_link';

export default defineComponent({
    props: { text: { type: String, required: true } },
    setup(props) {
        const mounted = ref(false);
        onMounted(() => mounted.value = true);

        function render_node(node: Node): VNodeChild {
            if (node.nodeType === Node.TEXT_NODE) {
                return parse_inline_links(node.textContent || '').map(part =>
                    typeof part === 'string' ? part : h(InlineLink, part));
            }
            if (!(node instanceof Element)) return null;
            const tag = node.tagName.toLowerCase();
            if (['script', 'style', 'iframe', 'object', 'embed'].includes(tag)) return null;
            const attributes = Object.fromEntries(Array.from(node.attributes)
                .filter(attribute => !/^(on|v-|:|@)/i.test(attribute.name)
                    && !(['href', 'src'].includes(attribute.name) && /^\s*javascript:/i.test(attribute.value)))
                .map(attribute => [attribute.name, attribute.value]));
            return h(tag, attributes, Array.from(node.childNodes).map(render_node));
        }

        return () => {
            if (!mounted.value) return h('span', { innerHTML: props.text });
            const document = new DOMParser().parseFromString(props.text, 'text/html');
            return h('span', Array.from(document.body.childNodes).map(render_node));
        };
    },
});
