import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          onClick={() => navigate(-1)}
          className="mb-6 bg-slate-600 hover:bg-slate-700 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FileText className="w-6 h-6" />
              利用規約
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">最終更新日: 2025年10月11日</p>
          </CardHeader>

          <CardContent className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第1条（適用）</h2>
              <p className="text-slate-700 leading-relaxed mb-3">
                本利用規約（以下「本規約」といいます）は、当社が提供する「AI経営管理システム」（以下「本サービス」といいます）の利用条件を定めるものです。
              </p>
              <p className="text-slate-700 leading-relaxed">
                ユーザーの皆様（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第2条（利用登録）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>本サービスの利用を希望する方は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
                <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                    <li>本規約に違反したことがある者からの申請である場合</li>
                    <li>その他、当社が利用登録を相当でないと判断した場合</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</li>
                <li>ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
                <li>当社は、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第4条（料金および支払方法）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>ユーザーは、本サービス利用の対価として、当社が別途定め、本ウェブサイトに表示する利用料金を、当社が指定する方法により支払うものとします。</li>
                <li>ユーザーが利用料金の支払を遅滞した場合には、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第5条（禁止事項）</h2>
              <p className="text-slate-700 mb-3">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当社、本サービスの他のユーザー、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>当社のサービスの運営を妨害するおそれのある行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>不正アクセスをし、またはこれを試みる行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>当社が許諾しない本サービス上での宣伝、広告、勧誘、または営業行為</li>
                <li>本サービスの他のユーザーまたは第三者に不利益、損害、不快感を与える行為</li>
                <li>当社、本サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
                <li>反社会的勢力に対する利益供与その他の協力行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第6条（本サービスの提供の停止等）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                  </ul>
                </li>
                <li>当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第7条（利用制限および登録抹消）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>本規約のいずれかの条項に違反した場合</li>
                    <li>登録事項に虚偽の事実があることが判明した場合</li>
                    <li>料金等の支払債務の不履行があった場合</li>
                    <li>当社からの連絡に対し、一定期間返答がない場合</li>
                    <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                    <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
                  </ul>
                </li>
                <li>当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第8条（保証の否認および免責事項）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しておりません。</li>
                <li>当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、本サービスに関する当社とユーザーとの間の契約が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。</li>
                <li>前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます）による債務不履行または不法行為によりユーザーに生じた損害のうち特別な事情から生じた損害（当社またはユーザーが損害発生につき予見し、または予見し得た場合を含みます）について一切の責任を負いません。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第9条（サービス内容の変更等）</h2>
              <p className="text-slate-700">
                当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第10条（利用規約の変更）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。</li>
                <li>変更後の本規約は、本サービス上に掲示された時点より効力を生じるものとします。</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第11条（個人情報の取扱い）</h2>
              <p className="text-slate-700">
                当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第12条（通知または連絡）</h2>
              <p className="text-slate-700">
                ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第13条（権利義務の譲渡の禁止）</h2>
              <p className="text-slate-700">
                ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">第14条（準拠法・裁判管轄）</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
              </ol>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">以上</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
