import React, { useEffect } from 'react'
import { NextPage, GetServerSideProps } from 'next'
import cx from 'classnames'
import { useRouter } from 'next/router'
import markdownit from 'markdown-it'
import prism from 'prismjs'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import useSWR from 'swr'
import { Link } from 'styled-cssgg'
import copy from 'copy-to-clipboard'

import { api, Github } from '~/api'
import { getId } from '~/utils/sheet'
import Layout from '~/components/Layout'
import pkg from 'package.json'
import { Meta } from '~/components/Meta'

dayjs.extend(relativeTime)
const md = new markdownit()
const maps: { [key: string]: string } = {}
const MarkdownIt = new markdownit({
  highlight: function(str, lang) {
    const language = maps[lang] || lang
    if (prism.languages[language]) {
      const code = prism.highlight(str, prism.languages[language], language)
      return `<pre class="language-${lang}"><code>${code}</code></pre>`
    }

    return `<pre class="language-${lang}"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

const Cheetsheet: NextPage<{ data: Github.Issue[] }> = props => {
  const router = useRouter()
  const { data } = useSWR(
    [`${pkg.author.name}-${pkg.name}-${router.query.id}-sheet`, router.query.id],
    (_name, id: string) => {
      return api.github.client.issues(id)
    },
    { initialData: props.data },
  )
  const id = router.query._id
  const issue = data?.find(v => getId(router.query.id as string, v) === id)
  useEffect(() => {
    const selected = document.querySelector(`#${id}`)
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth' })
    }
  }, [id])
  return (
    <Layout>
      <Meta title={issue?.title} description={issue?.body} />
      <div className="flex flex-col h-full w-full contianer items-center bg-gray-100 overflow-scroll">
        <h3 className="label lg:text-4xl text-xl text-gray-700 lg:my-20 my-5 mt-20">
          {router.query.id} <span className="text-gray-500">{'cheatsheet'}</span>
        </h3>
        <div className="lg:w-3/4 w-11/12">
          {data?.map(v => {
            return (
              <div
                className="lg:w-2/4 w-full lg:pr-4 pb-4"
                style={{ float: 'left' }}
                key={v.title}
                id={`${router.query.id}-${v.id}`}
              >
                <p className="mb-4 flex items-center">
                  <a className="text-blue-600 " href={v.html_url} target="_blank">
                    {v.title}
                    {v.state === 'open' ? (
                      <span className="rounded-lg inline-block bg-green-300 w-2 h-2 ml-2" />
                    ) : (
                      <span className="rounded-lg inline-block bg-red-300 w-2 h-2 ml-2" />
                    )}
                  </a>
                </p>
                <div
                  className={cx(
                    'shadow w-full bg-white rounded overflow-hidden theme-default-content',
                    { 'shadow-outline': `${router.query.id}-${v.id}` === id },
                  )}
                  key={v.title}
                  dangerouslySetInnerHTML={{ __html: MarkdownIt.render(v.body || '') }}
                />
                <div className="flex italic justify-between items-center text-xs text-gray-600 mt-2">
                  <Link
                    style={{ '--ggs': 0.7 } as any}
                    className="cursor-pointer"
                    onClick={() => {
                      copy(
                        `https://jiangweixian-cheatsheets.now.sh/sheet/${
                          router.query.id
                        }?_id=${getId(router.query.id as string, v)}`,
                      )
                      window.alert('复制成功')
                    }}
                  />
                  <div>
                    <time>{dayjs(v.updated_at).from(dayjs())}</time>
                    <span className="mx-2">/</span>
                    <time>{dayjs(v.created_at).format('YYYY-MM-DD')}</time>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(ctx: Parameters<GetServerSideProps>[0]) {
  const data = await api.github.client.issues(ctx?.params?.id as string)
  return { props: { data } }
}

export default Cheetsheet
